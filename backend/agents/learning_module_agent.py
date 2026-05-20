from review_agent import ReviewAgent
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.db.models import Material

DATABASE_URL = "postgresql+psycopg://postgres:postgres@localhost:5434/apollo"


class LearningModuleAgent:
    def __init__(self):
        self.review_agent = ReviewAgent()

    def generate_results(self, topic: str, advanced: bool = False):


        reviews = self.review_agent.review(topic, advanced)

        for r in reviews:
            r["from"] = "WEB"

        engine = create_engine(DATABASE_URL, future=True, pool_pre_ping=True)
        SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

        db = SessionLocal()

        m = Material()        

        return reviews
    

