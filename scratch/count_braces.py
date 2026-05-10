def count_braces(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    stack = []
    lines = content.split('\n')
    for i, line in enumerate(lines):
        for char in line:
            if char == '{':
                stack.append(('{', i + 1))
            elif char == '}':
                if not stack:
                    print(f"Extra closing brace at line {i + 1}")
                    continue
                stack.pop()
            elif char == '(':
                stack.append(('(', i + 1))
            elif char == ')':
                if not stack:
                    print(f"Extra closing parenthesis at line {i + 1}")
                    continue
                type, line_num = stack.pop()
                if type != '(':
                    # print(f"Mismatched closing parenthesis at line {i + 1} (expected closing brace for line {line_num})")
                    pass
                    
    for type, line_num in stack:
        print(f"Unclosed {type} from line {line_num}")

if __name__ == "__main__":
    count_braces(r'd:\Parasco\Ade\ADE 25-26\IT\StudyAM\src\pages\Dashboard.tsx')
