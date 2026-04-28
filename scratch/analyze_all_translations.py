import firebase_admin
from firebase_admin import credentials, firestore

key_path = r'c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\backups\assets\ue5-questions-prod-99289c4d03b3.json'
cred = credentials.Certificate(key_path)
firebase_admin.initialize_app(cred)
db = firestore.client()

print("Analyzing all translations...")
docs = db.collection('questions').get()

total = 0
english = 0
translations = 0
empty_translations = 0
empty_by_lang = {}
valid_by_lang = {}

for d in docs:
    total += 1
    data = d.to_dict()
    lang = data.get('language', 'English')
    
    if lang == 'English':
        english += 1
    else:
        translations += 1
        if not data.get('question') or not isinstance(data.get('question'), str) or len(data.get('question').strip()) == 0:
            empty_translations += 1
            empty_by_lang[lang] = empty_by_lang.get(lang, 0) + 1
        else:
            valid_by_lang[lang] = valid_by_lang.get(lang, 0) + 1

print(f"Total Documents: {total}")
print(f"English: {english}")
print(f"Translations: {translations}")
print(f"Empty/Invalid Translations: {empty_translations}")

print("\nBreakdown by Language:")
all_langs = set(list(empty_by_lang.keys()) + list(valid_by_lang.keys()))
for lang in sorted(all_langs):
    v = valid_by_lang.get(lang, 0)
    e = empty_by_lang.get(lang, 0)
    print(f"  - {lang.ljust(20)}: Valid={str(v).rjust(5)}, Empty={str(e).rjust(5)}")
