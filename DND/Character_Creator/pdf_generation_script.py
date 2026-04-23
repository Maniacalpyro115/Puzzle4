from pypdf import PdfReader, PdfWriter
from pypdf.generic import NameObject, BooleanObject

input_pdf = "5E_CharacterSheet_Fillable.pdf"
output_pdf = "filled_character_sheet.pdf"

character = {
    "CharacterName": "Aelar Moonshadow",
    "ClassLevel": "Wizard 5",
    "Background": "Sage",
    "PlayerName": "Jake",
    "Race ": "Elf",
    "Alignment": "Neutral Good",
    "XP": "6500",
    "STR": "8",
    "DEX": "14",
    "CON": "13",
    "INT": "18",
    "WIS": "12",
    "CHA": "10",
}

reader = PdfReader(input_pdf)
writer = PdfWriter()

for page in reader.pages:
    writer.add_page(page)

# Copy the AcroForm from reader to writer BEFORE filling fields
if "/AcroForm" in reader.trailer["/Root"]:
    writer._root_object.update(
        {
            NameObject("/AcroForm"): reader.trailer["/Root"]["/AcroForm"]
        }
    )
    writer._root_object["/AcroForm"].update(
        {NameObject("/NeedAppearances"): BooleanObject(True)}
    )
else:
    raise ValueError("This PDF does not appear to have fillable form fields.")

# Now fill fields
for page in writer.pages:
    writer.update_page_form_field_values(page, character)

with open(output_pdf, "wb") as f:
    writer.write(f)

print(f"Saved to {output_pdf}")