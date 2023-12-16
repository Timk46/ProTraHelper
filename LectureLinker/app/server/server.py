# Start with uvicorn server:app --reload
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
import langchain 
langchain.debug = True  # Super praktisch: Finales Prompt wird ausgegeben!

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    print(lecture)
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
    COLLECTION_NAME = "RN1_chunksize1500overlap225"  ## OFP = OFP_ChunkSize1500overlap225 ; RNI = RN1_ChunkSize1500overlap225
    match lecture:
        case "RN1":
            COLLECTION_NAME = "RN1_512_64"
        case "RN2":
            COLLECTION_NAME = "RN2_512_64"
        case "OFP":
            COLLECTION_NAME = "OFP_512_64"
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
                name="Quelle",
                description="STARTSOURCE Der Link zur Quelle im Markdown-Fußnotenformat zwischen ENDSOURCE",
                type="string",
            )
        ]

    template = """Du bist ein hilfreicher Tutor und du kannst sehr gut erklären. Gegeben sind die folgenden extrahierten Teile eines Vorlesungstranskripts und eine Frage. Erstelle eine finale Antwort mit Verweisen. Wenn du die Antwort nicht weißt, sage einfach, dass du es nicht weißt. Versuche nicht, eine Antwort zu erfinden. Du erhälst dazu merhfach Informationen aus Vorlesungstranskripten in folgendem Format:
    Content: Ausschnitt aus dem Vorlesungstranskript, welchen du referenzieren kannst. Zu einem Content gehört immer der Source, welches auf ihn folgt.
    Source: Die Quelle für den vorherigen Content. ALLES zwischen STARTSOURCE und ENDSOURCE inklusive ^ muss exakt übernommen werden, wenn der Content referenziert wird.
    Hinter JEDE EINZELNE Aussage muss direkt die zugehörige passende Quelle wie beschrieben gesetzt werden.
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
        retriever=store.as_retriever(search_type="similarity_score_threshold", search_kwargs={"score_threshold": .7, "k": 10}, metadata_field_info=metadata_field_info), # https://python.langchain.com/docs/modules/data_connection/retrievers/vectorstore
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

@app.websocket("/chat/{lecture}")
async def websocket_endpoint(websocket: WebSocket, lecture: str):
    await websocket.accept()
    query = await websocket.receive_text()  # Erste Nachricht vom Client erhalten

    stream_it = AsyncCallbackHandler(websocket)
    task = asyncio.create_task(run_call(query, lecture, stream_it))

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
        case "RN2":
            VIDEO_FOLDER = './storage/lectureVideos/RN2/'
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
