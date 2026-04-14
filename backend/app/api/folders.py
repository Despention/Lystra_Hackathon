from fastapi import APIRouter, HTTPException
from sqlalchemy import func, select

from app.database import Analysis, Folder, async_session, gen_uuid
from app.schemas import FolderCreateRequest, FolderResponse, MoveToFolderRequest

router = APIRouter()


@router.post("/api/folders", response_model=FolderResponse, status_code=201)
async def create_folder(request: FolderCreateRequest):
    async with async_session() as db:
        # Validate parent_id if provided
        if request.parent_id:
            result = await db.execute(
                select(Folder).where(Folder.id == request.parent_id)
            )
            if not result.scalar_one_or_none():
                raise HTTPException(status_code=404, detail="Parent folder not found")

        folder = Folder(
            id=gen_uuid(),
            name=request.name,
            parent_id=request.parent_id,
        )
        db.add(folder)
        await db.commit()
        await db.refresh(folder)

        return FolderResponse(
            id=folder.id,
            name=folder.name,
            parent_id=folder.parent_id,
            created_at=folder.created_at,
            analyses_count=0,
        )


@router.get("/api/folders", response_model=list[FolderResponse])
async def list_folders():
    async with async_session() as db:
        # Get all folders with analyses count
        query = (
            select(
                Folder,
                func.count(Analysis.id).label("analyses_count"),
            )
            .outerjoin(Analysis, Analysis.folder_id == Folder.id)
            .group_by(Folder.id)
            .order_by(Folder.created_at.desc())
        )
        result = await db.execute(query)
        rows = result.all()

        return [
            FolderResponse(
                id=folder.id,
                name=folder.name,
                parent_id=folder.parent_id,
                created_at=folder.created_at,
                analyses_count=count,
            )
            for folder, count in rows
        ]


@router.put("/api/folders/{folder_id}", response_model=FolderResponse)
async def rename_folder(folder_id: str, request: FolderCreateRequest):
    async with async_session() as db:
        result = await db.execute(
            select(Folder).where(Folder.id == folder_id)
        )
        folder = result.scalar_one_or_none()
        if not folder:
            raise HTTPException(status_code=404, detail="Folder not found")

        folder.name = request.name
        if request.parent_id is not None:
            folder.parent_id = request.parent_id
        await db.commit()
        await db.refresh(folder)

        # Count analyses
        count_result = await db.execute(
            select(func.count()).select_from(Analysis).where(Analysis.folder_id == folder_id)
        )
        analyses_count = count_result.scalar() or 0

        return FolderResponse(
            id=folder.id,
            name=folder.name,
            parent_id=folder.parent_id,
            created_at=folder.created_at,
            analyses_count=analyses_count,
        )


@router.delete("/api/folders/{folder_id}", status_code=204)
async def delete_folder(folder_id: str):
    async with async_session() as db:
        result = await db.execute(
            select(Folder).where(Folder.id == folder_id)
        )
        folder = result.scalar_one_or_none()
        if not folder:
            raise HTTPException(status_code=404, detail="Folder not found")

        # Set analyses folder_id to null
        analyses_result = await db.execute(
            select(Analysis).where(Analysis.folder_id == folder_id)
        )
        for analysis in analyses_result.scalars().all():
            analysis.folder_id = None

        await db.delete(folder)
        await db.commit()


@router.put("/api/analysis/{analysis_id}/folder")
async def move_analysis_to_folder(analysis_id: str, request: MoveToFolderRequest):
    async with async_session() as db:
        result = await db.execute(
            select(Analysis).where(Analysis.id == analysis_id)
        )
        analysis = result.scalar_one_or_none()
        if not analysis:
            raise HTTPException(status_code=404, detail="Analysis not found")

        # Validate folder_id if provided
        if request.folder_id:
            folder_result = await db.execute(
                select(Folder).where(Folder.id == request.folder_id)
            )
            if not folder_result.scalar_one_or_none():
                raise HTTPException(status_code=404, detail="Folder not found")

        analysis.folder_id = request.folder_id
        await db.commit()

        return {"status": "ok", "folder_id": analysis.folder_id}
