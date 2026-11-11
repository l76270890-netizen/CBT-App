from optparse import Option
import os
import psycopg2
import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv

from app import Question

# Load your .env file
load_dotenv()

# Configure Cloudinary
cloudinary.config(
    cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME"),
    api_key=os.environ.get("CLOUDINARY_API_KEY"),
    api_secret=os.environ.get("CLOUDINARY_API_SECRET"),
)

# Connect to your database
conn = psycopg2.connect(os.environ.get("DATABASE_URL"))
cur = conn.cursor()

# Map: question text -> image filename
questions = {
    "Identify the organ shown in the image.": "heart.jpg",
    "Which cell organelle controls the activities of a plant cell?": "plant-cell.jpg",
    "Which of the following is a unicellular organism?": "amoeba.jpg",
    "What is the major function of the lungs in humans?": "lungs.jpg",
    "What is the main function of the kidneys in humans?": "kidneys.jpg",

    "Identify the type of human tooth shown in the image.": "canine-tooth.jpg",
    "Which part of the flower shown in the image develops into a fruit after fertilization?": "flower-ovary.jpg",
    "Which part of the digestive system shown in the image absorbs most digested nutrients?": "small-intestine.jpg",
    "Identify the process shown in the image where a green plant uses sunlight to make food.": "photosynthesis.jpg",
    "Which stage of the butterfly life cycle is shown in the image?": "butterfly-pupa.jpg"
}


images_folder = os.path.join(os.getcwd(), "biology-import", "images")

print("Starting image fix...\n")

for question_text, filename in questions.items():
    image_path = os.path.join(images_folder, filename)

    if not os.path.exists(image_path):
        print(f"File not found: {image_path}")
        continue

    try:
        # Upload to Cloudinary
        result = cloudinary.uploader.upload(
            image_path, folder="examcore/questions")
        cloud_url = result["secure_url"]

        # Update the database
        cur.execute(
            "UPDATE question SET image_path = %s WHERE question = %s AND subject = 'Biology'",
            (cloud_url, question_text)
        )

        print(f"{filename} -> {cloud_url}")
        print(f"   Question: {question_text[:60]}...")
    except Exception as e:
        print(f"Failed for {filename}: {e}")

conn.commit()
cur.close()
conn.close()

print("\nDone! Refresh your student exam page to see the diagrams.")
