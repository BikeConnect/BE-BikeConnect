import os
import cv2
import numpy as np
import albumentations as A
from tqdm import tqdm


def load_image(image_path):
    image = cv2.imread(image_path)
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    return image


def save_image(image, save_path):
    image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
    cv2.imwrite(save_path, image)


def create_augmentations():
    return A.Compose([
        A.Affine(
            rotate=(-5, 5),
            translate_percent=(0.06, 0.06),
            scale=(0.85, 1.1),
            shear=10
        ),
        A.OneOf([
            A.PiecewiseAffine(scale=(0.01, 0.05), p=1),
            A.GaussNoise(),
        ], p=0.2),
        A.OneOf([
            A.MotionBlur(p=0.2),
            A.MedianBlur(blur_limit=3, p=0.1),
            A.GaussianBlur(blur_limit=(3, 3), p=1),
            A.Blur(blur_limit=3, p=0.1),
        ], p=0.2),
        A.ShiftScaleRotate(shift_limit=0.0225, scale_limit=0.2, rotate_limit=20, p=0.2),
        A.OneOf([
            A.OpticalDistortion(p=0.3),
            A.GridDistortion(p=0.1),
            A.PiecewiseAffine(p=0.3),
        ], p=0.2),
        A.OneOf([
            A.CLAHE(clip_limit=2, p=1),
            A.Sharpen(),
            A.Emboss(),
            A.RandomBrightnessContrast(),
        ], p=0.3),
        A.HueSaturationValue(p=0.3),
    ])


def get_mean_number_of_images(input_folder):
    number_of_images_each = []
    for class_folder in os.listdir(input_folder):
        class_path = os.path.join(input_folder, class_folder)
        if not os.path.isdir(class_path):
            continue
        image_files = [f for f in os.listdir(class_path) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
        number_of_images_each.append(len(image_files))
    return (np.mean(number_of_images_each), np.quantile(number_of_images_each, .20),
            np.quantile(number_of_images_each, .40), np.quantile(number_of_images_each, .60),
            np.quantile(number_of_images_each, .80))


def expand_dataset(input_folder, output_folder, max_num_augmentations=5):
    augmentations = create_augmentations()
    mean_number_of_images, q1, q2, q3, q4 = get_mean_number_of_images(input_folder)
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    for class_folder in os.listdir(input_folder):
        class_path = os.path.join(input_folder, class_folder)
        if not os.path.isdir(class_path):
            continue

        output_class_folder = os.path.join(output_folder, class_folder)
        if not os.path.exists(output_class_folder):
            os.makedirs(output_class_folder)

        image_files = [f for f in os.listdir(class_path) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
        num_images = len(image_files)
        if num_images < q1:
            num_augmentations = max_num_augmentations
        elif num_images < q2:
            num_augmentations = max_num_augmentations - 1
        elif num_images < q3:
            num_augmentations = max_num_augmentations - 2
        else:
            num_augmentations = max_num_augmentations - 3
        for image_file in tqdm(image_files, desc=f"Processing {class_folder}"):
            image_path = os.path.join(class_path, image_file)
            image = load_image(image_path)

            save_path = os.path.join(output_class_folder, image_file)
            save_image(image, save_path)
            for i in range(num_augmentations):
                augmented = augmentations(image=image)['image']
                aug_filename = f"{os.path.splitext(image_file)[0]}_aug_{i}{os.path.splitext(image_file)[1]}"
                aug_save_path = os.path.join(output_class_folder, aug_filename)
                save_image(augmented, aug_save_path)


if __name__ == "__main__":
    input_folder = "detection_data/train"
    output_folder = "augmented_data/train"
    max_num_augmentations = 5  # Number of augmented images to generate per original image

    expand_dataset(input_folder, output_folder, max_num_augmentations)
    # get_mean_number_of_images(input_folder)
    print("Dataset expansion completed!")
