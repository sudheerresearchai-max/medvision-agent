#!/usr/bin/env python
"""Generate untrained dummy ONNX U-Nets for smoke-testing the service.

RESEARCH PROTOTYPE ONLY — NOT APPROVED FOR CLINICAL DIAGNOSIS.

These graphs match the production I/O contract exactly:
    input  : float32 1×1×256×256   (name: "input")
    output : float32 1×1×256×256   (name: "logits")

They are RANDOMLY initialized — outputs are meaningless. Their purpose is to
let developers exercise preprocessing → ONNX Runtime → postprocessing → web UI
end-to-end before real trained weights exist (see training/ notebooks).

Usage:
    pip install onnx
    python scripts/make_dummy_onnx.py --all          # all three organs
    python scripts/make_dummy_onnx.py --organ brain  # single organ
"""

from __future__ import annotations

import argparse
import pathlib
import sys

import numpy as np

try:
    import onnx
    from onnx import TensorProto, helper, numpy_helper
except ImportError:
    sys.exit("The 'onnx' package is required: pip install onnx")

MODELS_DIR = pathlib.Path(__file__).resolve().parent.parent / "models"
SIZE = 256


def _init(name: str, shape: list[int], seed: int) -> onnx.TensorProto:
    rng = np.random.default_rng(seed)
    data = (rng.standard_normal(shape) * 0.02).astype(np.float32)
    return numpy_helper.from_array(data, name=name)


def build_dummy_unet(seed: int) -> onnx.ModelProto:
    """conv→relu→strided conv (down)→relu→transpose conv (up)→relu→1×1 conv.

    ~9k parameters; structurally a U-Net-ish autoencoder with the right I/O.
    """
    inits = [
        _init("ce_w", [8, 1, 3, 3], seed + 1),
        _init("ce_b", [8], seed + 2),
        _init("cd_w", [16, 8, 3, 3], seed + 3),
        _init("cd_b", [16], seed + 4),
        _init("cu_w", [8, 16, 2, 2], seed + 5),
        _init("cu_b", [8], seed + 6),
        _init("co_w", [1, 8, 1, 1], seed + 7),
        _init("co_b", [1], seed + 8),
    ]

    nodes = [
        helper.make_node("Conv", ["input", "ce_w", "ce_b"], ["e1"], kernel_shape=[3, 3], pads=[1, 1, 1, 1]),
        helper.make_node("Relu", ["e1"], ["e2"]),
        helper.make_node("Conv", ["e2", "cd_w", "cd_b"], ["d1"], strides=[2, 2], kernel_shape=[3, 3], pads=[1, 1, 1, 1]),
        helper.make_node("Relu", ["d1"], ["d2"]),
        helper.make_node("ConvTranspose", ["d2", "cu_w"], ["u1"], strides=[2, 2], kernel_shape=[2, 2]),
        helper.make_node("Relu", ["u1"], ["u2"]),
        helper.make_node("Conv", ["u2", "co_w", "co_b"], ["logits"], kernel_shape=[1, 1]),
    ]

    graph = helper.make_graph(
        nodes,
        f"medvision_dummy_unet_{seed}",
        [helper.make_tensor_value_info("input", TensorProto.FLOAT, [1, 1, SIZE, SIZE])],
        [helper.make_tensor_value_info("logits", TensorProto.FLOAT, [1, 1, SIZE, SIZE])],
        initializer=inits,
    )
    model = helper.make_model(graph, opset_imports=[helper.make_opsetid("", 17)])
    model.ir_version = 8  # broad onnxruntime compatibility
    onnx.checker.check_model(model)
    return model


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--all", action="store_true", help="generate brain/lung/pancreas")
    group.add_argument("--organ", choices=["brain", "lung", "pancreas"])
    args = parser.parse_args()

    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    organs = ["brain", "lung", "pancreas"] if args.all else [args.organ]
    for i, organ in enumerate(organs):
        path = MODELS_DIR / f"{organ}_unet.onnx"
        onnx.save(build_dummy_unet(seed=100 * (i + 1)), str(path))
        print(f"wrote {path}  (UNTRAINED dummy — do not use for anything real)")


if __name__ == "__main__":
    main()
