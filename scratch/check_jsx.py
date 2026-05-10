import re

def check_jsx(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove strings and comments
    content = re.sub(r'//.*', '', content)
    content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
    content = re.sub(r'["\'`](?:\\.|[^\'"\\])*["\'`]', '""', content)
    
    # Extract only JSX tags from return statements or between parentheses
    # This is hard, so we'll just try to be better at identifying JSX tags
    
    # Common React components in this project
    components = ['X', 'Pencil', 'Check', 'Trash2', 'LogOut', 'BookOpen', 'GraduationCap', 'Activity', 'Shield', 'Users', 'LayoutDashboard', 'ChevronDown', 'ChevronRight', 'Link2', 'FolderOpen', 'Folder', 'UploadCloud', 'FolderPlus', 'BarChart3', 'FileText', 'UserPlus', 'Search', 'ArrowLeft']
    
    # Find all tags
    tags = re.findall(r'<(/?)([a-zA-Z0-9.]+)([^>]*?)(/?)>', content)
    stack = []
    for is_closing, tag_name, attrs, is_self_closing in tags:
        # Ignore non-JSX tags (like generic types or fragments of code)
        if tag_name[0].islower() or tag_name in components or tag_name == '':
            pass # proceed
        elif tag_name == 'Fragment' or tag_name == 'div' or tag_name == 'section' or tag_name == 'main' or tag_name == 'aside' or tag_name == 'nav' or tag_name == 'header' or tag_name == 'footer' or tag_name == 'h1' or tag_name == 'h2' or tag_name == 'h3' or tag_name == 'h4' or tag_name == 'p' or tag_name == 'span' or tag_name == 'button' or tag_name == 'form' or tag_name == 'label' or tag_name == 'select' or tag_name == 'option' or tag_name == 'input' or tag_name == 'a' or tag_name == 'ul' or tag_name == 'li' or tag_name == 'table' or tag_name == 'thead' or tag_name == 'tbody' or tag_name == 'tr' or tag_name == 'th' or tag_name == 'td':
            pass # proceed
        else:
            continue # Skip custom components that might be types or other things
            
        if is_self_closing or tag_name in ['input', 'img', 'br', 'hr']:
            continue
            
        if not is_closing:
            stack.append(tag_name)
        else:
            if not stack:
                # print(f"Extra closing tag: </{tag_name}>")
                continue
            last_tag = stack.pop()
            if last_tag != tag_name:
                print(f"Mismatched tag: expected </{last_tag}>, found </{tag_name}>")
    
    if stack:
        # Filter stack for common JSX tags to see if we really missed any
        jsx_stack = [t for t in stack if t in ['div', 'section', 'main', 'aside', 'nav', 'form', 'button', 'p', 'span']]
        if jsx_stack:
            print(f"Unclosed JSX tags: {jsx_stack}")

if __name__ == "__main__":
    check_jsx(r'd:\Parasco\Ade\ADE 25-26\IT\StudyAM\src\pages\Dashboard.tsx')
