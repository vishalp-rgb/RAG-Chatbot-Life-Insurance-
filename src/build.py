import json, re, sys
B='/tmp/claude-0/-home-claude/84a49289-1cd4-508d-96e6-502923088e78/scratchpad/build/'
d=json.load(open('/tmp/lps2.json')); logos=json.load(open('/tmp/logos.json'))
LOGO=open(B+'logo.txt').read().strip()
css=open(B+'style.css').read(); a1=open(B+'app1.js').read(); a2=open(B+'app2.js').read()
data='window.LPS_DATA='+json.dumps(d,separators=(',',':'))+';\nwindow.LPS_DATA.LOGOS='+json.dumps(logos,separators=(',',':'))+';'
html=f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Life Insurance AI Assistant</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" rel="stylesheet">
<style>
{css}
</style>
<script>
{data}
window.BC_LOGO='{LOGO}';
</script>
</head>
<body>
<div class="app">
  <header>
    <button class="menu-btn" id="menuBtn" aria-label="Menu"><span class="ms" style="font-size:24px">menu</span></button>
    <img src="{LOGO}" alt="Bajaj Capital Insurance" data-fb="head">
    <div class="vsep"></div>
    <div class="bot-avatar"><span class="bc-mark"><img src="{LOGO}" alt="Bajaj Capital" data-fb="mark"></span></div>
    <div class="desk">
      <div class="desk-title"><span class="ms fill ai-star">auto_awesome</span>Life Insurance AI Assistant</div>
      <div class="desk-status"><span class="dot"></span>Online</div>
    </div>
    <div class="who" id="whoBtn" role="button" tabindex="0" title="Change your name">
      <div class="avatar" id="avatar">A</div>
      <div><div class="who-name" id="whoName">Advisor</div><div class="who-sub"><span class="ms">edit</span>Change name</div></div>
    </div>
  </header>
  <div class="body">
    <aside id="sidebar">
      <button class="new-btn" id="newBtn"><span class="ms" style="font-size:20px">add</span>New query</button>
      <div class="group"><div class="group-title">Recent queries</div><div id="recent"></div></div>
      <div class="group"><div class="group-title">Quick help</div><div id="quick"></div></div>
      <div class="group"><div class="group-title">Plan categories</div><div id="cats"></div></div>
      <button class="item me-item" id="meBtn"><span class="ms">account_circle</span><span id="meName">Advisor</span></button>
    </aside>
    <main>
      <div class="pattern" id="pattern"></div>
      <div class="scroll" id="scroll"><div class="thread" id="thread"></div></div>
      <div class="composer"><div class="composer-in">
        <div class="box" id="box">
          <input id="inp" placeholder="Ask about a client, a specific plan or a policy term..." autocomplete="off">
          <button class="mic" id="mic" aria-label="Voice input"><span class="ms">mic</span></button>
          <button class="send" id="send" aria-label="Send"><span class="ms fill">send</span></button>
        </div>
        <div class="foot">For internal use only · Bajaj Capital Insurance Broking Ltd</div>
      </div></div>
    </main>
  </div>
</div>
<script>
{a1}
</script>
<script>
{a2}
</script>
</body>
</html>
'''
out=sys.argv[1] if len(sys.argv)>1 else B+'life-insurance-ai-assistant.html'
open(out,'w').write(html); print(out,len(html))
