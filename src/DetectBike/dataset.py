from torch.utils.data import Dataset
import os
import cv2
import matplotlib.pyplot as plt
import numpy as np


class BikeDataset(Dataset):
    def __init__(self, root, transform=None, is_train=True):
        if is_train:
            dir = os.path.join(root, "train")
        else:
            dir = os.path.join(root, "test")
        list_dir = [os.path.join(dir, dr) for dr in os.listdir(dir)]
        self.classes = [dr.split('\\')[-1] for dr in list_dir]
        self.images = []
        self.labels = []
        for index, dr in enumerate(list_dir):
            for image in os.listdir(dr):
                img_path = os.path.join(dr, image)
                self.images.append(img_path)
                self.labels.append(index)
        self.transform = transform

    def __len__(self):
        return len(self.labels)

    def __getitem__(self, idx):
        image = cv2.imread(self.images[idx])
        # image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        # image = np.expand_dims(image, 2)
        label = self.labels[idx]
        if self.transform:
            image = self.transform(image)
        return image, label

if __name__ == '__main__':
    data = BikeDataset(root="data")