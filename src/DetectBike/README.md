# Project Name

Brief description of your project.

## Table of Contents
- [Installation](#installation)
- [Running the Application](#running-the-application)
  - [Using Docker](#using-docker)
  - [Using Python](#traditional-method)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

## Installation

To run this application, you need to have Python 3.8 or higher installed on your system. You also need to install the following dependencies:

- Flask==2.3.2
- matplotlib==3.7.1
- numpy==1.24.3
- opencv-python==4.7.0.72
- torch==2.0.1
- torchvision==0.15.2
- tqdm==4.65.0
- waitress==2.1.2
- Werkzeug==2.3.4

## Running the Application

### Using Docker

1. Make sure you have Docker installed on your system.

2. Clone the repository or download:
   <!-- ```
   git clone https://github.com/yourusername/your-repo.git
   cd DetectBike
   ``` -->

3. Build the Docker image:
   ```
   docker build -t your-project-name .
   ```

4. Run the Docker container:
   ```
   docker run -p 8080:8080 your-project-name
   ```

   The application should now be running and accessible at `http://localhost:8080`.

### Using Python

1. Clone the repository or download:
   <!-- ```
   git clone https://github.com/yourusername/your-repo.git
   cd your-repo
   ``` -->

2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Run the application:
   ```
   python app.py
   ```

   The application should now be running and accessible at `http://localhost:8080`.

## Usage

To use the application, you can send a POST request to the `/classify` endpoint with an image file. The application will process the image and return the predicted motorcycle model along with a confidence score.

Here's an example of how to use the application:

1. Ensure the server is running (either using Docker or Python as described in the "Running the Application" section).

2. Prepare an image file of a motorcycle you want to classify. The supported file formats are PNG, JPG, and JPEG.

3. Send a POST request to `http://localhost:8080/classify` with the image file. You can use tools like cURL, Postman, or write a simple script to do this.

   Example using cURL:
   ```
   curl -X POST -F "file=@path/to/your/image.jpg" http://localhost:8080/classify
   ```

4. The server will respond with a JSON object containing the predicted label (motorcycle model) and the confidence score. For example:
   ```json
   {
     "label": "Honda Vision",
     "confident_score": 0.95
   }
   ```

The application supports classification of the following motorcycle models:
- Honda Winner X
- Yamaha Grande
- Honda SH
- Honda Vision
- Honda Air Blade
- Honda Lead
- Honda Wave
- Yamaha Janus
- Yamaha Exciter
- Yamaha Sirius
- Honda Future

Note: The application uses a combination of object detection (to locate motorcycles in the image) and classification (to identify the specific model). For best results, ensure that the motorcycle is clearly visible in the image.