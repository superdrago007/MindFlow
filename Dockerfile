FROM python:3.13-slim
 
WORKDIR /app
 
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
 
# Copy project
COPY Backend/ .
 
# Expose port
EXPOSE 8000
 
# Run FastAPI with Uvicorn
CMD ["uvicorn", "app.Main_router:app", "--host", "0.0.0.0", "--port", "8000"]