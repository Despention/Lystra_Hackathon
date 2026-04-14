#!/bin/bash
# Download Gemma 4 GGUF models for llama.cpp
# Requires: pip install huggingface-hub

echo "Downloading Gemma 4 26B-A4B (Q4_K_M) for orchestrator and complex agents..."
huggingface-cli download ggml-org/gemma-4-26B-A4B-it-GGUF gemma-4-26B-A4B-it-Q4_K_M.gguf --local-dir ./models

echo "Downloading Gemma 4 E4B (Q4_K_M) for simple agents..."
huggingface-cli download ggml-org/gemma-4-E4B-it-GGUF gemma-4-E4B-it-Q4_K_M.gguf --local-dir ./models

echo "Done! Models saved to ./models/"
