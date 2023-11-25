# Start with uvicorn chatbot_server:app --reload
from fastapi import FastAPI
from pydantic import BaseModel
import os
from typing import List, Dict

from fastapi import FastAPI, Body,  HTTPException
from fastapi.responses import JSONResponse, StreamingResponse

from langchain.embeddings.openai import OpenAIEmbeddings
from langchain.vectorstores.pgvector import PGVector
from langchain.chains import RetrievalQAWithSourcesChain
from langchain.chat_models import ChatOpenAI
from langchain.prompts import PromptTemplate
from langchain.chains.query_constructor.base import AttributeInfo

app = FastAPI()

class Prompt(BaseModel):
    promptstr: str
class Response(BaseModel):
    responsestr: str

os.environ["OPENAI_API_KEY"]="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"

llm = ChatOpenAI(
    temperature = 0.0, 
    model = 'gpt-4-1106-preview'
    )

connection_string = PGVector.connection_string_from_db_params(
     driver=os.environ.get("PGVECTOR_DRIVER", "psycopg2"),
     host=os.environ.get("PGVECTOR_HOST", "vectordb.bshefl0.bs.informatik.uni-siegen.de"),
     port=int(os.environ.get("PGVECTOR_PORT", "3306")),
     database=os.environ.get("PGVECTOR_DATABASE", "vectordb"),
     user=os.environ.get("PGVECTOR_USER", "root"),
     password=os.environ.get("PGVECTOR_PASSWORD", "qzx5vQG9WQ2b35eZUWujPUhVb8xRr"),
 )

documents = []
CONNECTION_STRING = connection_string
COLLECTION_NAME = "RN1_chunksize1500overlap225"  ## OFP = ChunkSize1500overlap225 ; RNI = RN1chunksize1500overlap225
embeddings = OpenAIEmbeddings()

store = PGVector(
    collection_name=COLLECTION_NAME,
    connection_string=CONNECTION_STRING,
    embedding_function=embeddings,
)

@app.post("/ask/{lecture}", response_class=JSONResponse)
async def getAnswer(lecture: str, prompt: Prompt = Body(...)):
    match lecture:
        case "RN1":
            store.collection_name = "RN1_chunksize1500overlap225"
        case "OFP":
            store.collection_name = "OFP_ChunkSize1500overlap225"
        case _:
            # Default. Falls die Lecture nicht existiert, wird ein entsprechender Fehler zurückgegeben
            raise HTTPException(status_code=404, detail="Lecture does not exist")

    metadata_field_info = [
        AttributeInfo(
            name="source",
            description="The lecture Video and timestamp the chunk is from, looking like: Video: FILENAME.srt, Stelle: hh:mm:ss,000",
            type="string",
        ),
    ]

    question = prompt.promptstr
    print (question)

    template = """Du bist ein hilfreicher Tutor. Gegeben sind die folgenden extrahierten Teile eines Vorlesungstranskripts und eine Frage, erstelle eine finale Antwort mit Verweisen ("QUELLEN"). Wenn du die Antwort nicht weißt, sage einfach, dass du es nicht weißt. Versuche nicht, eine Antwort zu erfinden. GIB immer eine Antwort mit Fußnoten zu dem "QUELLEN"-Teil in deiner Antwort zurück. Nutze Metadaten. Schließe immer Quellen am Ende deiner Antwort ein. Eine Fußnote funktioniert so: Text zum Zitieren [^1] und dann am Ende der Antwort: [^1]: Quellentext.
    Der Quellentext MUSS in diesem Format angegeben werden (ersetze .srt durch .mp4): [FILENAME.mp4 bei Stelle](/video?fileName=FILENAME.mp4&timeStamp=Stelle)!
    Hier ist ein Besispiel: [^1]: [Einfuehrung_Motivation.mp4 an Stelle: 00:05:02,000](/video?fileName=Python_Einfuehrung_Motivation.mp4&timeStamp=00:05:02,000)
    
        Frage: {question}
        =========
        {summaries}
        =========
        Antwort: 
        """

    PROMPT = PromptTemplate(template=template, input_variables=["summaries", "question"])
    chain_type_kwargs = {"prompt": PROMPT}
    qa_chain = RetrievalQAWithSourcesChain.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=store.as_retriever(search_type="similarity_score_threshold", search_kwargs={"score_threshold": .5, "k": 10}, metadata_field_info=metadata_field_info), # https://python.langchain.com/docs/modules/data_connection/retrievers/vectorstore
        chain_type_kwargs=chain_type_kwargs,
        return_source_documents=True,
        verbose=True
    )
    answer = qa_chain({"question": question})

    responses = answer

    source_documents = responses["source_documents"]
    source_content = [doc.page_content for doc in source_documents]
    source_metadata = [doc.metadata for doc in source_documents]

    result = responses['answer']
    used_chunks = []

    for i in range(len(source_content)):
        used_chunks.append({
            "metadata": source_metadata[i]['source'],
            "content": source_content[i]
        })

    return JSONResponse(content={
        "result": result,
        "usedChunks": used_chunks
    })


# Funktion zum Streamen von Videodateien
def video_streamer(video_path: str):
    with open(video_path, "rb") as video_file:
        # Lesen der Videodatei in Chunks
        while chunk := video_file.read(1024 * 1024):  # liest 1 MB pro Chunk
            # Senden des Chunks an den Client
            yield chunk

# FastAPI-Endpunkt zum Streamen von Videodateien
@app.get("/video/{lecture}/{video_name}")
async def stream_video( lecture: str, video_name: str):
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

    # Erstellen einer StreamingResponse, die das Video streamt
    return StreamingResponse(
        video_streamer(video_path),
        media_type="video/mp4",
        headers={"Content-Disposition": f"attachment;filename={video_name}.mp4"},
    )