import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

conn = psycopg2.connect(os.environ.get("DATABASE_URL"))
cur = conn.cursor()

urls = {
    "Identify the type of human tooth shown in the image.": "https://res.cloudinary.com/dnrpqwgcs/image/upload/v1794283072/canine-tooth_hupv5x.jpg",
    "Which part of the flower shown in the image develops into a fruit after fertilization?": "https://res.cloudinary.com/dnrpqwgcs/image/upload/v1794283072/flower-ovary_ywrebs.jpg",
    "Which part of the digestive system shown in the image absorbs most digested nutrients?": "https://res.cloudinary.com/dnrpqwgcs/image/upload/v1794283072/small-intestine_wm4b8r.jpg",
    "Identify the process shown in the image where a green plant uses sunlight to make food.": "https://res.cloudinary.com/dnrpqwgcs/image/upload/v1794283071/photosynthesis_poa9as.jpg",
    "Which stage of the butterfly life cycle is shown in the image?": "https://res.cloudinary.com/dnrpqwgcs/image/upload/v1794283048/butterfly-pupa_uxznmy.jpg",


    # Mathematics (add your Cloudinary URLs below)
    "In the circle geometry diagram provided, find the value of the angle marked x at the circumference if the angle at the center is 130°.": "https://res.cloudinary.com/dnrpqwgcs/image/upload/v1794289072/circle-geometry_rnnata.png",
    "A man walks 4 km due North from point A to point B, then turns and walks 3 km due East to point C. Calculate his bearing from his starting position A.": "https://res.cloudinary.com/dnrpqwgcs/image/upload/v1794289071/bearing-problem_ri4qzl.png",
    "Calculate the total volume of the closed cylinder shown in the image, given a base radius of 7 cm and a vertical height of 10 cm. (Take π = 22/7)": "https://res.cloudinary.com/dnrpqwgcs/image/upload/v1794289100/cylinder-volume_phkmva.png",
    "Solve the following simultaneous linear equations for the variable x:  2x + y = 10 and x − y = 2.": "",
    "Find the sum of the first 20 terms of the Arithmetic Progression (A.P.) sequence given by: 3, 7, 11, 15, ...": "",



    # Economics
    "In the Production Possibility Curve (PPC) shown in the image, what does point B located inside the curve represent?": "https://res.cloudinary.com/dnrpqwgcs/image/upload/v1794300787/ppc-curve_nsfzke.png",
    "What does the shift of the demand curve from D1 to D2 shown in the diagram represent?": "https://res.cloudinary.com/dnrpqwgcs/image/upload/v1794300786/demand-shift_vy0rhb.png",
    "Which of the following taxes is classified as an indirect tax?": "",
    "Calculate the Gross Domestic Product (GDP) if Consumption (C) = ₦500m, Investment (I) = ₦200m, Government Spending (G) = ₦150m, Exports (X) = ₦100m, and Imports (M) = ₦80m.": "",


    "Calculate the area of the shaded sector of the circle with center O and radius 7 cm shown in the diagram. (Take π = 22/7)": "https://res.cloudinary.com/dnrpqwgcs/image/upload/v1794319529/sector-area_td5q9c.png"


}

count = 0
for question, url in urls.items():
    if not url:
        print(f"⚠️  Skipping: {question[:50]}... (no URL)")
        continue
    cur.execute(
        "UPDATE questions SET image_path = %s WHERE question = %s",
        (url, question)
    )
    print(f"✅ Updated: {question[:50]}...")
    count += 1

conn.commit()
cur.close()
conn.close()
print(f"\nDone! {count} images updated. Refresh your student exam page.")
