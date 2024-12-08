import os
import cv2
import torch

data_path = "data/train"
detection_path = "detection_data/train"
motorbike_class_index = 3
model = torch.hub.load("ultralytics/yolov5", "yolov5m")
for path in os.listdir(detection_path):
    files = os.listdir(os.path.join(detection_path, path))
    for file in files:
        file_path = os.path.join(detection_path, path, file)
        if os.path.isfile(file_path):
            os.remove(file_path)
    img_idx = 0
    for image in os.listdir(os.path.join(data_path, path)):
        image_path = os.path.join(data_path, path, image)
        img = cv2.imread(image_path)
        results = model(image_path)
        res = results.xyxy[0]
        for xmin, ymin, xmax, ymax, conf, clazz in res:
            if int(clazz) == motorbike_class_index and conf >= 0.8:
                img_crop = img[int(ymin):int(ymax), int(xmin):int(xmax)]
                cv2.imwrite(os.path.join(detection_path, path, "{}.jpg".format(img_idx)), img_crop)
                img_idx += 1
