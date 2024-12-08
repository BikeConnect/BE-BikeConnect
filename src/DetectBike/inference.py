import os.path

from torchvision.models import efficientnet_b4
from torch.nn import Softmax, Sequential, Dropout, Linear
import torch
import numpy as np
import cv2


def inference(model, object_detection_model, data_path, image_name, categories):
    bike_class_yolo = 3
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    softmax = Softmax()
    ori_img = cv2.imread(os.path.join(data_path, image_name))
    predictions = []
    object_detection_model.to(device)
    model.to(device)
    object_detection_model.eval()
    with torch.no_grad():
        results = object_detection_model(ori_img)
        res = results.xyxy[0]
        bboxes = []
        for row in res:
            xmin, ymin, xmax, ymax, conf, clazz = [item.item() for item in row]
            if int(clazz) == bike_class_yolo:
                bboxes.append((int(xmin), int(xmax), int(ymin), int(ymax)))
        for xmin, xmax, ymin, ymax in bboxes:
            img_crop = ori_img[ymin:ymax, xmin:xmax, :]
            img_crop = cv2.cvtColor(img_crop, cv2.COLOR_BGR2RGB)
            img_crop = cv2.resize(img_crop, (224, 224))
            img_crop = np.transpose(img_crop, (2, 0, 1)) / 255.
            img_crop = np.expand_dims(img_crop, axis=0)
            img_crop = torch.from_numpy(img_crop).float().to(device)
            model.eval()
            cls_prediction = model(img_crop)
            prob = softmax(cls_prediction)
            result_class = categories[torch.argmax(prob, dim=1)]
            predictions.append((result_class, conf))
    return max(predictions, key=lambda x: x[1])


# if __name__ == '__main__':

#     image_names = ['grande.png', 'exciter.png', 'janus.png', 'lead.png', 'vision.png', 'wave.png', 'winner.png']
#     save_path = "trained_model"
#     model = efficientnet_b4()
#     detection_model = torch.hub.load("ultralytics/yolov5", "yolov5m")
#     model.classifier = model.classifier = Sequential(
#         Dropout(p=0.2, inplace=True),
#         Linear(in_features=model.classifier[1].in_features, out_features=11, bias=True)
#     )
#     saved_model = torch.load(os.path.join(save_path, "best.pt"))
#     categories = ['Honda Winner X', 'Yamaha Grande', 'Honda SH', 'Honda Vision', 'Honda Air Blade',
#                   'Honda Lead', 'Honda Wave', 'Yamaha Janus', 'Yamaha Exciter', 'Yamaha Sirius', 'Honda Future']
#     save_path = "trained_model"
#     data_path = "inference_data"
#     model.load_state_dict(saved_model["model_state"])
#     for image in image_names:
#         res = inference(model, detection_model, data_path, image, categories)
#         print(res)
