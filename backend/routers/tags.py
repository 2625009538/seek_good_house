"""
标签相关API路由
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import Tag
from schemas import TagResponse

router = APIRouter(prefix="/api/tags", tags=["tags"])


@router.get("/", response_model=List[TagResponse])
def get_tags(db: Session = Depends(get_db)):
    """
    获取所有标签
    """
    tags = db.query(Tag).all()
    return tags
