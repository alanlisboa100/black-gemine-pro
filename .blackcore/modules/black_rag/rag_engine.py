#!/usr/bin/env python3
"""
rag_engine.py - Motor RAG Local em SQLite FTS5 para indexação e busca em BLACKCORE
"""

import os
import sqlite3
from pathlib import Path

DB_PATH = Path.home() / ".blackcore" / "black_rag.db"
PROJECTS_DIR = Path.home() / "BLACKCORE-Projects"

class BlackRAGEngine:
    def __init__(self, db_path=DB_PATH):
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.init_db()

    def init_db(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        # Criação da tabela FTS5 para busca textual ultra-rápida e inteligente
        cursor.execute("""
            CREATE VIRTUAL TABLE IF NOT EXISTS project_docs USING fts5(
                file_path,
                project_name,
                content,
                tokenize='unicode61'
            );
        """)
        conn.commit()
        conn.close()

    def index_workspace(self, root_dir=PROJECTS_DIR):
        if not root_dir.exists():
            return 0
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM project_docs;")
        
        count = 0
        for p in root_dir.rglob("*"):
            if p.is_file() and not any(part.startswith('.') or part in ['node_modules', '__pycache__', 'dist', '.next'] for part in p.parts):
                try:
                    if p.suffix in ['.py', '.js', '.ts', '.tsx', '.json', '.md', '.html', '.css', '.yaml', '.yml']:
                        text = p.read_text(encoding='utf-8', errors='ignore')
                        rel_path = str(p.relative_to(root_dir))
                        project_name = p.parts[len(root_dir.parts)] if len(p.parts) > len(root_dir.parts) else "root"
                        
                        cursor.execute(
                            "INSERT INTO project_docs (file_path, project_name, content) VALUES (?, ?, ?);",
                            (rel_path, project_name, text[:50000]) # Limita trechos grandes
                        )
                        count += 1
                except Exception:
                    pass
                    
        conn.commit()
        conn.close()
        print(f"🧠 [BLACK RAG] Indexados {count} arquivos de projetos com sucesso.")
        return count

    def search(self, query, limit=5):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        try:
            cursor.execute("""
                SELECT file_path, project_name, snippet(project_docs, 2, '<b>', '</b>', '...', 32)
                FROM project_docs
                WHERE project_docs MATCH ?
                LIMIT ?;
            """, (query, limit))
            results = cursor.fetchall()
        except Exception as e:
            results = []
        conn.close()
        return results

if __name__ == "__main__":
    rag = BlackRAGEngine()
    rag.index_workspace()
    print("🔍 Teste de busca 'Misuki':", rag.search("Misuki"))
