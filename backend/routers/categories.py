from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from database import get_db
from models import Category

router = APIRouter(prefix="/categories", tags=["categories"])


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


@router.get("/")
def get_categories(db: Session = Depends(get_db)):
    return db.query(Category).order_by(Category.name).all()


@router.post("/")
def create_category(body: CategoryCreate, db: Session = Depends(get_db)):
    existing = db.query(Category).filter(Category.name == body.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="이미 존재하는 카테고리입니다")
    cat = Category(name=body.name)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@router.delete("/{category_id}")
def delete_category(category_id: int, db: Session = Depends(get_db)):
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    db.delete(cat)
    db.commit()
    return {"ok": True}
