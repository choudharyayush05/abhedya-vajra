.PHONY: setup ingest detect train trace legal test build run clean features score eval

setup:
	python3 -m venv .venv
	.venv/bin/pip install --upgrade pip
	.venv/bin/pip install -r requirements.txt
	cd frontend && npm install && npm run build

features:
	PYTHONPATH=. .venv/bin/python -c "import duckdb, yaml; from engine.features import extract_features; cfg = yaml.safe_load(open('config.yaml')); con = duckdb.connect('data/duckdb/vajra.duckdb'); res = extract_features(con, cfg); print(f'Extracted {len(res[\"features\"])} account feature vectors.')"

score:
	PYTHONPATH=. .venv/bin/python -c "import duckdb; from engine.fusion import run_pipeline; con = duckdb.connect('data/duckdb/vajra.duckdb'); res = run_pipeline(con); print(res)"

eval:
	PYTHONPATH=. .venv/bin/python eval/run_eval.py

test:
	PYTHONPATH=. .venv/bin/pytest tests/test_engine.py -v

ingest:
	.venv/bin/python bench/benchmark_ingestion.py

detect:
	.venv/bin/python bench/benchmark_detection.py

train:
	.venv/bin/python bench/train_isolation_forest.py

trace:
	.venv/bin/python bench/benchmark_graph_trace.py

legal:
	.venv/bin/python bench/benchmark_legal_generator.py

build:
	cd frontend && npm run build

run:
	./run.sh

clean:
	rm -rf frontend/dist __pycache__ .pytest_cache

