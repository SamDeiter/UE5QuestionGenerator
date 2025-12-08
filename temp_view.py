import pandas as pd

df = pd.read_excel('docs/EdGameDevQuestions24th.xlsx')
print(f'Total questions: {len(df)}')
print('\nSample questions:\n')

for i, row in df.head(30).iterrows():
    ans = str(row['Answer'])
    q_type = 'T/F' if ans in ['True', 'False'] else 'MC'
    q_text = str(row['Question'])[:120]
    print(f'{i+1}. [{q_type}] {q_text}...')
    if q_type == 'MC':
        print(f'   Answer: {ans}')
    print()
