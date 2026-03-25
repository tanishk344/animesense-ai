import re

css_file = "c:/Users/Lenovo/Desktop/Antigravity/AI ANIME ASSITENT/css/base.css"

with open(css_file, 'r', encoding='utf-8') as f:
    css = f.read()

# Update .navbar
navbar_old = re.search(r'\.navbar \{[^}]*\}', css).group(0)
navbar_new = '''.navbar {
    position: fixed;
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
    width: calc(100% - 24px);
    max-width: 1200px;
    height: auto;
    z-index: var(--z-fixed);
    display: flex;
    align-items: center;
    background: rgba(10, 10, 25, 0.6);
    backdrop-filter: blur(12px);
    border-radius: 14px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    transition: var(--transition-base);
    box-sizing: border-box;
}'''

# Update .nav-container
nav_container_old = re.search(r'\.nav-container \{[^}]*\}', css).group(0)
nav_container_new = '''.nav-container {
    width: 100%;
    padding: 16px 40px;
    display: flex;
    align-items: center;
    justify-content: space-between;
}'''

# Update .nav-logo
nav_logo_old = re.search(r'\.nav-logo \{[^}]*\}', css).group(0)
nav_logo_new = '''.nav-logo {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: var(--fs-xl);
    font-weight: var(--fw-bold);
    z-index: var(--z-fixed);
}'''

# Update .logo-icon completely
old_logo_icon_css = re.compile(r'\.logo-icon\s*{[^}]*}\s*@media\s*\([^)]*\)\s*{\s*\.logo-icon\s*{[^}]*}\s*}', re.MULTILINE)
logo_icon_new = '''
.logo-icon {
    width: 36px;
    height: 36px;
    margin-right: 0;
    border-radius: var(--radius-sm, 4px);
    transition: transform 0.3s ease, filter 0.3s ease;
    filter: drop-shadow(0 0 8px rgba(124,58,237,0.5));
}
@media (max-width: 1024px) {
    .logo-icon {
        width: 30px;
        height: 30px;
    }
}
@media (max-width: 768px) {
    .logo-icon {
        width: 26px;
        height: 26px;
    }
}
'''

# Update .nav-links
nav_links_old = re.search(r'\.nav-links \{[^}]*\}', css).group(0)
nav_links_new = '''.nav-links {
    display: flex;
    gap: 28px;
    align-items: center;
}'''

# Update .nav-link Hover
old_nav_link_group = re.search(r'\.nav-link:hover,\s*\.nav-link.active\s*\{[^}]*\}', css)
if old_nav_link_group:
    css = css.replace(old_nav_link_group.group(0), '''
.nav-link:hover,
.nav-link.active {
    background: var(--surface-2);
}
.nav-link:hover {
    color: transparent;
    background: linear-gradient(90deg, #7c3aed, #3b82f6);
    -webkit-background-clip: text;
    background-clip: text;
    transition: all 0.25s ease;
}
''')

# Update .nav-actions
nav_actions_old = re.search(r'\.nav-actions \{[^}]*\}', css).group(0)
nav_actions_new = '''.nav-actions {
    display: flex;
    align-items: center;
    gap: 16px;
}'''

# Update mobile container padding
mobile_nav_replacements = '''
@media (max-width: 768px) {
    .navbar {
        top: 8px;
        width: calc(100% - 16px);
    }
    .nav-container {
        padding: 12px 20px;
    }
'''
if '@media (max-width: 768px) {' in css:
    css = css.replace('@media (max-width: 768px) {', mobile_nav_replacements)


css = css.replace(navbar_old, navbar_new)
css = css.replace(nav_container_old, nav_container_new)
css = css.replace(nav_logo_old, nav_logo_new)
css = css.replace(nav_links_old, nav_links_new)
css = css.replace(nav_actions_old, nav_actions_new)

# if the big regex found the logo block, replace it
if old_logo_icon_css.search(css):
    css = old_logo_icon_css.sub(logo_icon_new, css)
else:
    print("Could not find the logo media block, fallback substitution")
    fallback = re.search(r'\.logo-icon\s*{[^}]*}', css).group(0)
    css = css.replace(fallback, logo_icon_new)

with open(css_file, 'w', encoding='utf-8') as f:
    f.write(css)

print("CSS updated successfully")
