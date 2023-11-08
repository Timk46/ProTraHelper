# Start with uvicorn main:app --reload
from fastapi import FastAPI
from pydantic import BaseModel
import os

from fastapi import FastAPI, Body
from fastapi.responses import JSONResponse

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

llm = ChatOpenAI(temperature = 0.0, model = 'gpt-4-1106-preview')

connection_string = PGVector.connection_string_from_db_params(
     driver=os.environ.get("PGVECTOR_DRIVER", "psycopg2"),
     host=os.environ.get("PGVECTOR_HOST", "185.216.179.150"),
     port=int(os.environ.get("PGVECTOR_PORT", "33101")),
     database=os.environ.get("PGVECTOR_DATABASE", "vectordb"),
     user=os.environ.get("PGVECTOR_USER", "root"),
     password=os.environ.get("PGVECTOR_PASSWORD", "qzx5vQG9WQ2b35eZUWujPUhVb8xRr"),
 )
documents = []
CONNECTION_STRING = connection_string
COLLECTION_NAME = "ChunkSize1500overlap225"  ## OFP = ChunkSize1500overlap225 ; RNI = RN1chunksize1500overlap225
embeddings = OpenAIEmbeddings()

store = PGVector(
    collection_name=COLLECTION_NAME,
    connection_string=CONNECTION_STRING,
    embedding_function=embeddings,
)
@app.post("/", response_class=JSONResponse)
async def root(prompt: Prompt = Body(...)):
    metadata_field_info = [
        AttributeInfo(
            name="source",
            description="The lecture Video and timestamp the chunk is from, looking like: Video: FILENAME.srt, Stelle: hh:mm:ss,000",
            type="string",
        ),
    ]

    question = prompt.promptstr

    template = """Du bist ein hilfreicher Tutor. Gegeben sind die folgenden extrahierten Teile eines Vorlesungstranskripts und eine Frage, erstelle eine finale Antwort mit Verweisen ("QUELLEN"). Wenn du die Antwort nicht weißt, sage einfach, dass du es nicht weißt. Versuche nicht, eine Antwort zu erfinden. GIB immer eine Antwort mit Fußnoten zu dem "QUELLEN"-Teil in deiner Antwort zurück. Nutze Metadaten. Schließe immer Quellen am Ende deiner Antwort ein. Eine Fußnote funktioniert so: Text zum Zitieren [^1] und dann am Ende der Antwort: [^1]: Quellentext.

        Frage: {question}
        =========
        {summaries}
        =========
        Antwort: 
        Quellen: """
        
    PROMPT = PromptTemplate(template=template, input_variables=["summaries", "question"])
    chain_type_kwargs = {"prompt": PROMPT}
    qa_chain = RetrievalQAWithSourcesChain.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=store.as_retriever(metadata_field_info=metadata_field_info),
        chain_type_kwargs=chain_type_kwargs,
        return_source_documents=True,
        verbose=True
    )
    answer = qa_chain({"question": question})

    responses = answer #qa_stuff_with_sources({"query": query})

    source_documents = responses["source_documents"]
    source_content = [doc.page_content for doc in source_documents]
    source_metadata = [doc.metadata for doc in source_documents]
    
    result = responses['answer']
    usedChunks = ""

    for i in range(len(source_content)):
        usedChunks += "\n\n" +  source_metadata[i]['source']
        usedChunks += "\n" + source_content[i]

    return JSONResponse(content={
        "result": result,
        "usedChunks": usedChunks
    })