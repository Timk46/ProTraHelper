# Start with uvicorn main:app --reload
import os
import asyncio
from typing import Any
import uvicorn

from pydantic import BaseModel

from fastapi import FastAPI, Body, HTTPException, Request, WebSocket
from fastapi.responses import StreamingResponse
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from langchain.chat_models import ChatOpenAI
from langchain.callbacks.streaming_aiter import AsyncIteratorCallbackHandler
from langchain.schema import LLMResult

from langchain.embeddings.openai import OpenAIEmbeddings
from langchain.vectorstores.pgvector import PGVector
from langchain.chains import RetrievalQAWithSourcesChain
from langchain.prompts import PromptTemplate
from langchain.chains.query_constructor.base import AttributeInfo
#import langchain 
#langchain.debug = True  # Super praktisch: Finales Prompt wird ausgegeben!

app = FastAPI()

os.environ["OPENAI_API_KEY"]="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"

class AsyncCallbackHandler(AsyncIteratorCallbackHandler):

        
    def __init__(self, websocket: WebSocket) -> None:
        self.websocket = websocket
        super().__init__()
        
    content: str = ""
    final_answer: bool = False
    

    async def on_llm_new_token(self, token: str, **kwargs: Any) -> None:
        if token is not None and token != "":
            await self.websocket.send_text(token)
            self.queue.put_nowait(token)
            
    async def on_llm_end(self, response: LLMResult, **kwargs: Any) -> None:
        self.done.set()

    async def on_llm_error(self, error: BaseException, **kwargs: Any) -> None:
        self.done.set()
         

async def run_call(query: str, lecture: str, stream_it: AsyncCallbackHandler):
    llm = ChatOpenAI(
    openai_api_key=os.getenv("OPENAI_API_KEY"),
    temperature=0.0,
    model = 'gpt-4-1106-preview',
    streaming=True,  # ! important
    callbacks=[]  # ! important (but we will add them later)
)

    connection_string = PGVector.connection_string_from_db_params(
        driver=os.environ.get("PGVECTOR_DRIVER", "psycopg2"),
        host=os.environ.get("PGVECTOR_HOST", "vectordb.bshefl0.bs.informatik.uni-siegen.de"),
        port=int(os.environ.get("PGVECTOR_PORT", "3306")),
        database=os.environ.get("PGVECTOR_DATABASE", "vectordb"),
        user=os.environ.get("PGVECTOR_USER", "root"),
        password=os.environ.get("PGVECTOR_PASSWORD", "qzx5vQG9WQ2b35eZUWujPUhVb8xRr"),
    )

    CONNECTION_STRING = connection_string
    COLLECTION_NAME = "RN1_chunksize1500overlap225"  ## OFP = ChunkSize1500overlap225 ; RNI = RN1chunksize1500overlap225
    match lecture:
        case "RN1":
            COLLECTION_NAME = "RN1_chunksize1500overlap225"
        case "OFP":
            COLLECTION_NAME = "OFP_ChunkSize1500overlap225"
        case _:
            # Default. Falls die Lecture nicht existiert, wird ein entsprechender Fehler zurückgegeben
            raise HTTPException(status_code=404, detail="Lecture does not exist")

    embeddings = OpenAIEmbeddings()

    store = PGVector(
        collection_name=COLLECTION_NAME,
        connection_string=CONNECTION_STRING,
        embedding_function=embeddings,
    )

    metadata_field_info = [
            AttributeInfo(
                name="source",
                description="Der Dateiname, aus welchem der Content extrahiert wurde.",
                type="string",
            )
        ]

    template = """Du bist ein hilfreicher Tutor und kannst sehr gut erklären. Gegeben sind die folgenden extrahierten Teile eines Vorlesungstranskripts und eine Frage, erstelle eine finale Antwort mit Verweisen ("QUELLEN"). Wenn du die Antwort nicht weißt, sage einfach, dass du es nicht weißt. Versuche nicht, eine Antwort zu erfinden. Du erhälst dazu merhfach Informationen aus Vorlesungstranskripten in folgendem Format:
    Content: Ausschnitt aus dem Vorlesungstranskript, welchen du referenzieren kannst. Zu einem Content gehört immer der Source, welches auf ihn folgt.
    Source: filename: Der Dateiname timestamp: Der timestamp aus den Metadaten. 

    Für alles, was du den contents benutzt, musst du den passenden filename und timestamp aus dem Source wie folgt hinzufügen: ^[[FILENAME.mp4 bei Stelle](/video?fileName=FILENAME.mp4&timeStamp=TIMESTAMP)]

    Ein Beispiel:
    Content: unterschiedlichen Fragenformate auch mal zu zeigen. Der Hauptteil der Klausur ist aber nach wie vor Freitext. Das heißt, es gibt auch ganz viele Freitextaufgaben, allerdings normalerweise wirklich nur mit ein paar Zeilen Text, also ein paar Sätzen, die Sie angeben müssen. Beispielsweise hier beschreiben Sie kurz die grundsätzliche Vorgehensweise bei der 4b5b-Codierung und ich gebe Ihnen häufig dann noch in Klammern Erklärungen an, was ich jetzt genau von Ihnen wissen will. Die bitte genau lesen. Source: filename: 11-1-Probeklausur.srt timestamp: 00:26:15,000
    Beispiel-Antwort: In der Klausur werden hauptsächlich Freitextaufgaben gestellt, bei denen Sie in der Regel nur ein paar Sätze schreiben müssen. Zum Beispiel könnten Sie aufgefordert werden, die grundsätzliche Vorgehensweise bei der 4b5b-Codierung zu beschreiben, wobei in Klammern zusätzliche Erklärungen angegeben sein können, die genau lesen sollten  ^[[11-1-Probeklausur.mp4 an Stelle: 00:26:15,000](/video?fileName=11-1-Probeklausur.mp4&timeStamp=00:26:15,000)].

    Verfahre für folgende Frage nach dem gleichen Schema:

        Frage: {question}
        =========
        {summaries}
        =========
        Antwort: 
        """

    PROMPT = PromptTemplate(template=template, input_variables=["summaries", "question"])

    chain_type_kwargs = {"prompt": PROMPT}

    llm2 = llm
    llm2.callbacks = [stream_it]
    qa_chain = RetrievalQAWithSourcesChain.from_chain_type(
        llm=llm2,
        chain_type="stuff",
        retriever=store.as_retriever(search_type="similarity_score_threshold", search_kwargs={"score_threshold": .7, "k": 15}, metadata_field_info=metadata_field_info), # https://python.langchain.com/docs/modules/data_connection/retrievers/vectorstore
        chain_type_kwargs=chain_type_kwargs,
        return_source_documents=True,
        verbose=True
        
    )

    await qa_chain.acall(inputs={"question": query})

# request input format
class Query(BaseModel):
    text: str

async def create_gen(query: str, stream_it: AsyncCallbackHandler):
    task = asyncio.create_task(run_call(query, stream_it))
    async for token in stream_it.aiter():
        yield token
    await task

@app.websocket("/chat/{lecture}/{query}")
async def websocket_endpoint(websocket: WebSocket,lecture: str, query: str):
  
    await websocket.accept()
    stream_it = AsyncCallbackHandler(websocket)
    task = asyncio.create_task(run_call(query,lecture, stream_it))

    await task  # Warten, bis der Task beendet ist
    await websocket.close()

@app.get("/health")
async def health():
    """Check the api is running"""
    return {"status": "🤙"}


##################################################################################### Videos
# Funktion zum Streamen von Videodateien

def video_streamer(video_path: str, start: int, end: int):
    with open(video_path, "rb") as video_file:
        video_file.seek(start)
        while (chunk := video_file.read(end - start + 1)):
            yield chunk

@app.get("/video/{lecture}/{video_name}")
async def stream_video(request: Request, lecture: str, video_name: str):
    VIDEO_FOLDER =""
    # Überprüfen, ob die Videodatei im angegebenen Ordner existiert
    video_path = os.path.join(VIDEO_FOLDER, f"{video_name}")
    match lecture:
        case "RN1":
            VIDEO_FOLDER = './storage/lectureVideos/RN1/'
        case "OFP":
            VIDEO_FOLDER = './storage/lectureVideos/OFP/' 
        case _:
            # Default. Falls die Lecture nicht existiert, wird ein entsprechender Fehler zurückgegeben
            raise HTTPException(status_code=404, detail="Lecture does not exist")

    video_path = os.path.join(VIDEO_FOLDER, f"{video_name}")
    if not os.path.isfile(video_path):
        # Falls die Datei nicht existiert, wird ein entsprechender Fehler zurückgegeben
        raise HTTPException(status_code=404, detail="Video not found")


    range_header = request.headers.get("range")
    if range_header:
        range_start, range_end = range_header.strip().split("=")[1].split("-")
        range_start, range_end = int(range_start), int(range_end) if range_end else None
    else:
        range_start, range_end = None, None

    file_size = os.path.getsize(video_path)

    if range_start is not None:
        content_range = f"bytes {range_start}-{range_end or file_size - 1}/{file_size}"
        headers = {
            "Content-Range": content_range,
            "Content-Disposition": f"attachment;filename={video_name}.mp4",
            "Accept-Ranges": "bytes",
        }
        return StreamingResponse(
            video_streamer(video_path, range_start, range_end or file_size - 1),
            media_type="video/mp4",
            headers=headers,
            status_code=206,
        )
    else:
        return StreamingResponse(
            video_streamer(video_path, 0, file_size - 1),
            media_type="video/mp4",
            headers={"Content-Disposition": f"attachment;filename={video_name}.mp4"},
        )
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="localhost",
        port=8000,
        reload=True
    )