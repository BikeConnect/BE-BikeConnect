import torch.nn as nn
import torch


class BikeModel(nn.Module):
    def __init__(self, num_classes):
        super().__init__()
        self.conv1 = self.make_block(3, 16, 3)
        self.conv2 = self.make_block(16, 32, 3)
        self.conv3 = self.make_block(32, 64, 3)
        self.fc1 = nn.Sequential(
            nn.Linear(in_features=50176, out_features=1024),
            nn.ReLU(),
            nn.Dropout(p=0.5)
        )
        self.fc2 = nn.Sequential(
            nn.Linear(in_features=1024, out_features=256),
            nn.ReLU(),
            nn.Dropout(p=0.5)
        )
        self.fc3 = nn.Linear(in_features=256, out_features=num_classes)

    def forward(self, x):
        x = self.conv1(x)
        x = self.conv2(x)
        x = self.conv3(x)

        x = x.view(x.size(0), -1)

        x = self.fc1(x)
        x = self.fc2(x)
        x = self.fc3(x)

        return x

    def make_block(self, in_channels, out_channels, kernel_size):
        return nn.Sequential(
            nn.Conv2d(in_channels=in_channels, out_channels=out_channels, kernel_size=kernel_size, stride=1,
                      padding="same"),
            nn.BatchNorm2d(num_features=out_channels),
            nn.ReLU(),
            nn.Conv2d(in_channels=out_channels, out_channels=out_channels, kernel_size=kernel_size, stride=1,
                      padding="same"),
            nn.BatchNorm2d(num_features=out_channels),
            nn.ReLU(),
            nn.MaxPool2d(kernel_size=2),
            nn.Dropout2d(p=0.2)
        )


if __name__ == '__main__':
    model = BikeModel(num_classes=5)
    sample_input = torch.rand(8, 3, 224, 224)
    output = model(sample_input)
    print(output.shape)
