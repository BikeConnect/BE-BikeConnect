from dataset import BikeDataset
from torch.optim import Adam
from torch.nn import CrossEntropyLoss, Linear
from sklearn.metrics import accuracy_score, confusion_matrix
from tqdm.autonotebook import tqdm
from torch.utils.tensorboard import SummaryWriter
import shutil
import os
from torchvision.transforms import ToTensor, Compose, Resize, RandomAffine, ColorJitter, Normalize
from torchvision.models import resnet18, resnet50, resnet101, efficientnet_b1
from torchvision.models.resnet import ResNet18_Weights, ResNet50_Weights
from torch.utils.data import DataLoader
import matplotlib.pyplot as plt
import numpy as np
import torch


num_classes = 11
num_epochs = 100
save_path = "trained_model"
log_path = "tensorboard/bike"
data_path = "data"


def plot_confusion_matrix(writer, cm, class_names, epoch):
    figure = plt.figure(figsize=(20, 20))
    plt.imshow(cm, interpolation="nearest", cmap="Wistia")
    plt.title("Confusion matrix")
    plt.colorbar()
    tick_marks = np.arange(len(class_names))
    plt.xticks(tick_marks, class_names, rotation=45)
    plt.yticks(tick_marks, class_names)

    # Normalize the confusion matrix.
    cm = np.around(cm.astype("float") / cm.sum(axis=1)[:, np.newaxis], decimals=2)

    # Use white text if squares are dark; otherwise black.
    threshold = cm.max() / 2.0

    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            color = "white" if cm[i, j] > threshold else "black"
            plt.text(j, i, cm[i, j], horizontalalignment="center", color=color)

    plt.tight_layout()
    plt.ylabel("True label")
    plt.xlabel("Predicted label")
    writer.add_figure("confusion_matrix", figure, epoch)


def train():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(device)
    if os.path.isdir(log_path):
        shutil.rmtree(log_path)
    os.makedirs(log_path)
    if not os.path.isdir(save_path):
        os.makedirs(save_path)

    train_transform = Compose(
        [
            ToTensor(),
            RandomAffine(degrees=(-5, 5), translate=(0.15, 0.15), scale=(0.85, 1.1), shear=10),
            Resize((224, 224)),
            ColorJitter(brightness=0.125, contrast=0.5, saturation=0.5, hue=0.05),
            Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ]
    )

    test_transform = Compose(
        [ToTensor(), Resize((224, 224)), Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])]
    )

    train_dataset = BikeDataset(root=data_path, is_train=True, transform=train_transform)
    test_dataset = BikeDataset(root=data_path, is_train=False, transform=test_transform)

    train_params = {"batch_size": 32, "num_workers": 6, "shuffle": True, "drop_last": False}

    test_params = {"batch_size": 32, "num_workers": 6, "shuffle": True, "drop_last": False}

    train_data = DataLoader(dataset=train_dataset, **train_params)
    test_data = DataLoader(dataset=test_dataset, **test_params)
    num_iter_per_epochs = len(train_data)
    model = resnet18(weights=ResNet18_Weights.DEFAULT)
    model.fc = Linear(in_features=model.fc.in_features, out_features=11)
    model.to(device)
    optimizer = Adam(params=model.parameters(), lr=1e-2, betas=(0.9, 0.999), eps=1e-08, weight_decay=1e-5)
    criterion = CrossEntropyLoss()
    best_acc = -1
    last_epoch = 0
    if os.path.isdir(save_path) and os.path.exists(os.path.join(save_path, "last.pt")):
        saved_model = torch.load(os.path.join(save_path, "last.pt"))
        model.load_state_dict(saved_model["model_state"])
        best_acc = saved_model["acc"]
        last_epoch = saved_model["epoch"]
        optimizer.load_state_dict(saved_model["opt_state"])
    writer = SummaryWriter(log_dir=log_path)
    for epoch in range(last_epoch, num_epochs):
        train_losses = []
        progress_bar = tqdm(train_data)
        model.train()
        for i, (images, labels) in enumerate(progress_bar):
            images = images.to(device)
            labels = labels.to(device)
            predictions = model(images)
            loss = criterion(predictions, labels)
            train_losses.append(loss.item())
            avg_loss = np.mean(train_losses)

            optimizer.zero_grad()
            loss.backward()
            optimizer.step()

            progress_bar.set_description("Epoch: {}, Train Loss: {:0.4f}".format(epoch, avg_loss))
            writer.add_scalar("Train Loss", avg_loss, epoch * num_iter_per_epochs + i)

        model.eval()
        with torch.no_grad():
            progress_bar = tqdm(test_data)
            all_losses = []
            all_predictions = []
            all_labels = []

            for i, (images, labels) in enumerate(progress_bar):
                images = images.to(device)
                labels = labels.to(device)
                predictions = model(images)
                loss = criterion(predictions, labels)
                all_losses.append(loss.item())
                preds = torch.argmax(predictions, dim=1)
                all_predictions.extend(preds.cpu().numpy())
                all_labels.extend(labels.cpu().numpy())

            conf_matrix = confusion_matrix(all_labels, all_predictions)
            loss = sum(all_losses) / len(all_losses)
            plot_confusion_matrix(writer, conf_matrix, train_dataset.classes, epoch)
            acc = accuracy_score(all_labels, all_predictions)
            check_point = {
                "model_state": model.state_dict(),
                "epoch": epoch+1,
                "acc": acc,
                "opt_state": optimizer.state_dict()
            }
            torch.save(check_point, os.path.join(save_path, "last.pt"))
            if acc > best_acc:
                best_acc = acc
                torch.save(check_point, os.path.join(save_path, "best.pt"))
            print(".Accuracy: {}. Loss: {}".format(acc, loss))
            writer.add_scalar("Val/Loss", loss, epoch)
            writer.add_scalar("Accuracy", acc, epoch)

if __name__ == '__main__':
    train()