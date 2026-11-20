#!/usr/bin/env python3
"""Comprime uma cópia de um relatório local; o arquivo original é preservado."""
import argparse
import json
import os
from pathlib import Path
import sys

os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("LITELLM_LOCAL_MODEL_COST_MAP", "True")
os.environ.setdefault("HEADROOM_TIKTOKEN_LOAD_TIMEOUT_SECONDS", "1")

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("arquivo", type=Path)
args = parser.parse_args()
original = args.arquivo.read_text(encoding="utf-8")
try:
    from headroom import compress
    from headroom.compress import CompressConfig
except ImportError:
    parser.exit(2, "Instale scripts/dev/requirements-headroom.txt em um ambiente virtual.\n")

# Sem proxy, chamadas de LLM, modelos de compressão ou mudança nas sessões dos agentes.
result = compress(
    [{"role": "tool", "tool_call_id": "relatorio_local", "content": original}],
    model="gpt-4o",
    config=CompressConfig(protect_recent=0, kompress_model="disabled"),
)
content = result.messages[0]["content"]
if not isinstance(content, str):
    content = json.dumps(content, ensure_ascii=False)
# Para relatórios pequenos ou que cresçam, devolve o original.
if result.tokens_after >= result.tokens_before:
    content = original
print(content)
print(json.dumps({"original": str(args.arquivo.resolve()),
                  "tokens_antes_estimados": result.tokens_before,
                  "tokens_depois_estimados": min(result.tokens_after, result.tokens_before)},
                 ensure_ascii=False), file=sys.stderr)
