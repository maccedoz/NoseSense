from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes import provider_routes, test_routes, result_routes

app = FastAPI()

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(provider_routes.router, prefix="/api")
app.include_router(test_routes.router, prefix="/api")
app.include_router(result_routes.router, prefix="/api")


@app.get("/")
async def health_check():
    return {"status": "online", "message": "Test Smells automation backend is active"}


if __name__ == "__main__":
    import uvicorn
    print("\n🚀 Starting FastAPI server. Waiting for Frontend requests (http://localhost:8001/api/run-tests)...")
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
