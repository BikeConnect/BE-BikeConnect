from flask import Flask, request, Response
import os
from torchvision.models import efficientnet_b4
from torch.nn import Linear, Sequential, Dropout
from flask_cors import CORS
import torch
from inference import inference
from werkzeug.utils import secure_filename
import argparse
import json
from waitress.server import create_server

app = Flask(__name__)
CORS(app)

# ---------------------- Config ----------------------
print("================= Configuration =================")
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg"}
categories = [
    "Honda Winner X",
    "Yamaha Grande",
    "Honda SH",
    "Honda Vision",
    "Honda Air Blade",
    "Honda Lead",
    "Honda Wave",
    "Yamaha Janus",
    "Yamaha Exciter",
    "Yamaha Sirius",
    "Honda Future",
]
save_path = "trained_model"
data_path = "inference_data"
model = efficientnet_b4()
detection_model = torch.hub.load("ultralytics/yolov5", "yolov5m")
model.classifier = model.classifier = Sequential(
    Dropout(p=0.2, inplace=True), Linear(in_features=model.classifier[1].in_features, out_features=11, bias=True)
)
saved_model = torch.load(os.path.join(save_path, "best.pt"), map_location=torch.device("cpu"))
model.load_state_dict(saved_model["model_state"])
app.config["UPLOAD_FOLDER"] = data_path
print("================= End Configuration =================")
# ---------------------- End Config ----------------------


def get_args():
    parser = argparse.ArgumentParser("Run Arguments")
    parser.add_argument("--port", "-p", type=str, default="8080")
    args = parser.parse_args()
    return args


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route("/classify", methods=["POST"])
def process_image():
    if "file" not in request.files:
        return "No file part"
    file = request.files["file"]
    if file.filename == "":
        return "No selected file"
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file.save(os.path.join(app.config["UPLOAD_FOLDER"], filename))
    prediction = inference(model, detection_model, data_path, file.filename, categories)
    res = {"label": prediction[0], "confident_score": prediction[1]}
    response = Response(response=json.dumps(res), status=200, mimetype="application/json")
    return response


if __name__ == "__main__":
    args = get_args()
    host = "0.0.0.0"
    port = args.port
    server = create_server(app, host=host, port=port)
    actual_host = server.effective_host
    actual_port = server.effective_port
    print(f"* Server running on http://{actual_host}:{actual_port}")
    server.run()
