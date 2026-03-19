import glob

files = glob.glob('*.html') + glob.glob('js/*.js')
for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Absolute all variants by checking prefix precisely
    content = content.replace('href="chat.html', 'href="/chat.html')
    content = content.replace('href="search.html', 'href="/search.html')
    content = content.replace('href="watchlist.html', 'href="/watchlist.html')
    content = content.replace('href="index.html', 'href="/index.html')
    content = content.replace('href="dashboard.html', 'href="/dashboard.html')

    content = content.replace("href='chat.html", "href='/chat.html")
    content = content.replace("href='search.html", "href='/search.html")
    content = content.replace("href='watchlist.html", "href='/watchlist.html")
    content = content.replace("href='index.html", "href='/index.html")
    content = content.replace("href='dashboard.html", "href='/dashboard.html")

    content = content.replace("window.location.href='chat.html", "window.location.href='/chat.html")
    content = content.replace('window.location.href="chat.html', 'window.location.href="/chat.html')

    # Remove duplicates if rerunning
    content = content.replace('href="//', 'href="/')
    content = content.replace("href='//", "href='/")
    content = content.replace("window.location.href='//", "window.location.href='/")
    content = content.replace('window.location.href="//', 'window.location.href="/')

    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)
