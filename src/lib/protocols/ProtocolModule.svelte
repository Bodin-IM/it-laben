<script>
  import { onMount } from 'svelte';
  import { replaceState } from '$app/navigation';
  import { page } from '$app/state';
  import { protocols, protocolById } from './protocols.js';

  /** @typedef {{id:string,name:string,sub:string,icon:string,x:number,y:number}} NetworkNode */
  /** @typedef {{title:string,from:string,to:string|string[],label:string,explanation:string,packet:string[]}} NetworkStep */
  /** @typedef {{question:string,choices:string[],correct:number,explanation:string}} ProtocolQuestion */
  /** @typedef {{code:string,detail:string}} ProtocolCommand */
  /** @typedef {{id:string,name:string,full:string,layer:string,ports:string,color:string,short:string,intro:string,points:string[],nodes:NetworkNode[],links:string[][],steps:NetworkStep[],commands:ProtocolCommand[],questions:ProtocolQuestion[],challenge:string,localSteps?:NetworkStep[],localNodes?:NetworkNode[],localLinks?:string[][]}} Protocol */
  const protocolList = /** @type {Protocol[]} */ (protocols);
  const protocolMap = /** @type {Record<string, Protocol>} */ (protocolById);

  let chosen = $state('intro');
  let stepIndex = $state(0);
  let playing = $state(false);
  let speed = $state(3400);
  let answers = $state(/** @type {Record<string, number>} */ ({}));
  let revealed = $state(/** @type {Record<string, boolean>} */ ({}));
  let sidebarOpen = $state(false);
  let showPacket = $state(true);
  let dnsMode = $state('hierarchy');
  let p = $derived(/** @type {Protocol | undefined} */ (protocolMap[chosen]));
  let activeSteps = $derived(p?.id === 'dns' && dnsMode === 'local' ? p.localSteps ?? p.steps : p?.steps ?? []);
  let activeNodes = $derived(p?.id === 'dns' && dnsMode === 'local' ? p.localNodes ?? p.nodes : p?.nodes ?? []);
  let activeLinks = $derived(p?.id === 'dns' && dnsMode === 'local' ? p.localLinks ?? p.links : p?.links ?? []);
  let current = $derived(activeSteps[stepIndex]);
  let arpCachePopulated = $derived(p?.id === 'arp' && stepIndex >= 4);
  let dhcpConfigured = $derived(p?.id === 'dhcp' && stepIndex >= 4);
  let natRows = $derived(chosen === 'nat' ? [
    ...(stepIndex >= 1 ? [{ local:'192.168.1.10', src:'51514', public:'203.0.113.5', nat:'40001', owner:'PC A' }] : []),
    ...(stepIndex >= 3 ? [{ local:'192.168.1.11', src:'52625', public:'203.0.113.5', nat:'40002', owner:'PC B' }] : [])
  ] : []);
  let natLookup = $derived(chosen === 'nat' && stepIndex >= 4 ? (stepIndex <= 5 ? '40002' : '40001') : null);
  let internetTopology = $derived(['dns','ip','tcp','udp'].includes(chosen) && !(chosen === 'dns' && dnsMode === 'local'));


  /** @param {string} id */
  function openProtocol(id) {
    chosen = id;
    stepIndex = 0;
    dnsMode = 'hierarchy';
    playing = false;
    sidebarOpen = false;
    if (typeof history !== 'undefined') replaceState(id === 'intro' ? location.pathname + location.search : `#${id}`, page.state);
  }
  function next() { if (p) stepIndex = (stepIndex + 1) % activeSteps.length; }
  function previous() { if (p) stepIndex = (stepIndex + activeSteps.length - 1) % activeSteps.length; }
  function reset() { stepIndex = 0; playing = false; }
  /** @param {number} question @param {number} choice */
  function chooseAnswer(question, choice) {
    answers = { ...answers, [`${chosen}-${question}`]: choice };
    revealed = { ...revealed, [`${chosen}-${question}`]: true };
  }
  /** @param {string | undefined} id */
  function node(id) { return activeNodes.find(n => n.id === id); }
  function origin() { return node(current?.from); }
  /** @returns {NetworkNode[]} */
  function destination() { return current?.to ? (Array.isArray(current.to) ? current.to.map(node).filter((n) => n !== undefined) : [node(current.to)].filter((n) => n !== undefined)) : []; }
  // Finn kabelfølgen via switch/ruter i stedet for å animere rett gjennom lufta.
  /** @param {string} fromId @param {string} toId */
  function networkPath(fromId, toId) {
    const from = node(fromId), to = node(toId);
    if (!from || !to || fromId === toId) return '';
    /** @type {string[][]} */
    const queue = [[fromId]];
    const visited = new Set([fromId]);
    while (queue.length) {
      const path = queue.shift();
      if (!path) continue;
      const last = path[path.length - 1];
      if (last === toId) return path.map((id, i) => {
        const n = node(id);
        return n ? `${i === 0 ? 'M' : 'L'}${n.x},${n.y}` : '';
      }).join(' ');
      for (const [a,b] of activeLinks) {
        const next = a === last ? b : b === last ? a : null;
        if (next && !visited.has(next)) { visited.add(next); queue.push([...path,next]); }
      }
    }
    return '';
  }
  onMount(() => {
    let id = decodeURIComponent(location.hash.slice(1));
    if (protocolMap[id]) chosen = id;
    /** @param {KeyboardEvent} event */
    const keyHandler = (event) => {
      if (event.target instanceof Element && event.target.matches('input,textarea,select,button')) return;
      if (event.key === 'ArrowRight' && p) next();
      if (event.key === 'ArrowLeft' && p) previous();
    };
    document.addEventListener('keydown', keyHandler);
    return () => document.removeEventListener('keydown', keyHandler);
  });
  $effect(() => {
    if (!playing || !p) return;
    const interval = setInterval(() => { stepIndex = (stepIndex + 1) % activeSteps.length; }, speed);
    return () => clearInterval(interval);
  });
</script>

<svelte:head>
  <title>{p ? `${p.name} | Protokoller` : 'Protokoller | Driftsstøtte'}</title>
  <meta name="description" content="Interaktiv undervisning om nettverksprotokoller for IT-elever." />
</svelte:head>

<div class="shell">
  <aside class:open={sidebarOpen} aria-label="Navigasjon i protokollmodulen">
    <div class="sidebar-header">
      <div class="sidebar-heading">
        <span class="sidebar-eyebrow">DRIFTSSTØTTE</span>
        <strong>Protokoller</strong>
        <span class="sidebar-subtitle">8 emner · nettverk</span>
      </div>
      <button class="sidebar-close" aria-label="Lukk emnemenyen" onclick={() => sidebarOpen = false}>×</button>
    </div>
    <nav class="protocol-nav" aria-label="Velg emne">
      <button class:active={chosen === 'intro'} aria-current={chosen === 'intro' ? 'page' : undefined} class="navbtn intro-link" onclick={() => openProtocol('intro')}>
        <span class="nav-icon" aria-hidden="true">⌂</span>
        <span class="nav-text"><strong>Oversikt</strong></span>
      </button>
      <div class="aside-heading protoheading">EMNER</div>
      {#each protocolList as proto, i}
        <button class:active={chosen === proto.id} aria-current={chosen === proto.id ? 'page' : undefined} class="navbtn" onclick={() => openProtocol(proto.id)}>
          <span class="nav-number">{String(i + 1).padStart(2,'0')}</span>
          <span class="nav-text"><strong>{proto.name}</strong>{#if chosen === proto.id}<small>{proto.short}</small>{/if}</span>
          <span class="nav-chevron" aria-hidden="true">›</span>
        </button>
      {/each}
    </nav>
    <a class="sidebar-back" href="/?visning=elev&fag=drift">← Til Driftsstøtte</a>
  </aside>
  {#if sidebarOpen}<button class="scrim" aria-label="Lukk meny" onclick={() => sidebarOpen = false}></button>{/if}
  <div class="main-layout">
    <header class="topbar">
      <button class="menu-toggle" aria-label="Åpne emnemeny" aria-expanded={sidebarOpen} onclick={() => sidebarOpen = !sidebarOpen}>☰</button>
      <span>MODUL 02 <span class="crumb-sep">/</span> PROTOKOLLER <span class="crumb-sep">/</span> {p ? p.name : 'INTRODUKSJON'}</span>
      <span class="header-pill">VG2 · IT-DRIFT</span>
    </header>
    <main id="hovedinnhold" tabindex="-1">
      {#if !p}
        <section class="hero introhero">
          <div class="eyebrow"><span class="spark">✦</span> NETTVERK · FRA TEORI TIL PRAKSIS</div>
          <h1>Hvordan snakker<br /><em>datamaskiner</em> sammen?</h1>
          <p>Bak hver nettside, melding og tilkobling arbeider flere protokoller sammen. I denne modulen følger du pakkene gjennom nettverket og ser <strong>hva som faktisk skjer</strong>.</p>
          <button class="primary" onclick={() => openProtocol('arp')}>Start med ARP <span>↗</span></button>
        </section>
        <section class="intro-diagram" aria-label="Illustrasjon av pakketrafikk">
          <div class="mini-device"><span>💻</span><strong>Klient</strong><small>192.168.1.10</small></div>
          <div class="mini-wire"><span class="mini-packet">IP-pakke →</span></div>
          <div class="mini-device"><span>📡</span><strong>Ruter</strong><small>Standard-gateway</small></div>
          <div class="mini-wire"><span class="mini-packet second">→ TCP / UDP</span></div>
          <div class="mini-device"><span>🖥️</span><strong>Server</strong><small>Tjeneste / port</small></div>
        </section>
        <section class="intro-content">
          <div class="section-kicker">LÆRINGSMÅL</div>
          <h2>Åtte emner. Ett nettverk.</h2>
          <p>Velg en protokoll fra menyen, les forklaringen, kjør animasjonen steg for steg, undersøk pakkefeltene og test forståelsen med oppgavene.</p>
          <div class="protocol-grid">
            {#each protocolList as proto, i}
              <button class="protocol-tile" onclick={() => openProtocol(proto.id)} style={`--tile:${proto.color}`}>
                <span class="tile-index">{String(i+1).padStart(2,'0')}</span>
                <strong>{proto.name}</strong>
                <span>{proto.short}</span>
                <span class="tile-arrow">↗</span>
              </button>
            {/each}
          </div>
          <div class="notice"><strong>Viktig faglig skille:</strong> ARP, IP, TCP og UDP er protokoller på forskjellige nivåer. DHCP, DNS og HTTP er applikasjonsprotokoller. NAT er egentlig en funksjon som endrer adresser og ofte portnummer — ikke en egen protokoll.</div>
        </section>
      {:else}
        <section class="protocol-header">
          <div class="eyebrow"><span class="spark">✦</span> PROTOKOLL {String(protocolList.indexOf(p) + 1).padStart(2,'0')} / 08</div>
          <div class="heading-row"><div><h1>{p.name}<span class="heading-dot" style={`background:${p.color}`}></span></h1><div class="subtitle">{p.full}</div></div><div class="pill-stack"><span>{p.layer}</span><span>{p.ports}</span></div></div>
          <p>{p.intro}</p>
        </section>
        <section class="card animation-card">
          <div class="card-titlebar"><div><div class="section-kicker">PAKKELABORATORIET</div><h2>Følg trafikken</h2></div><div class="step-count">STEG <strong>{stepIndex+1}</strong> / {activeSteps.length}</div></div>
          {#if chosen === 'dns'}
            <div class="scenario-tabs" role="group" aria-label="Velg DNS-animasjon">
              <button class:chosen={dnsMode==='hierarchy'} onclick={() => {dnsMode='hierarchy';stepIndex=0;playing=false}}>DNS-hierarkiet</button>
              <button class:chosen={dnsMode==='local'} onclick={() => {dnsMode='local';stepIndex=0;playing=false}}>Lokale oppslag først</button>
            </div>
          {/if}
          {#if chosen === 'arp'}
            <div class="lesson-analogy"><strong>Første skoledag:</strong> Læreren vet at «Ole» finnes (IP), men ikke hvem han er. Hun spør hele klassen (broadcast). Ole rekker opp hånden (ARP Reply), og læreren husker hvem som er Ole (ARP-cache). På Ethernet er det <strong>MAC-adressene</strong> som brukes for lokal levering av rammer; IP-adressene forteller hvilken IP-enhet vi ønsker å nå.</div>
          {/if}
          <div class="network" style={`--accent:${p.color}`}>
            <svg viewBox="0 0 750 320" role="img" aria-label={`Nettverksdiagram for ${p.name}`}>
              <defs>
                <marker id="arrowMarker" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#506078" /></marker>
              </defs>
              {#if internetTopology}
                <g aria-label="Internett">
                  <rect x={chosen === 'ip' ? 352 : chosen === 'dns' ? 420 : 338} y="25" width={chosen === 'dns' ? 143 : 260} height="270" rx="60" class="internet-cloud" />
                  <text x={chosen === 'ip' ? 480 : chosen === 'dns' ? 491 : 465} y="44" class="cloud-label">INTERNETT ☁</text>
                </g>
              {/if}
              {#each activeLinks as link}
                {@const a = node(link[0])}{@const b = node(link[1])}
                {#if a && b}<line x1={a.x} y1={a.y} x2={b.x} y2={b.y} class="cable" />{/if}
              {/each}
              {#each activeNodes as n}
                <g class:node-active={current && (current.from === n.id || current.to === n.id || (Array.isArray(current.to) && current.to.includes(n.id)))}>
                  <rect x={n.x-(internetTopology || chosen === 'nat' ? 53 : 76)} y={n.y-31} width={internetTopology || chosen === 'nat' ? 106 : 152} height="86" rx="12" class="node-box" />
                  <text x={n.x} y={n.y-5} class="node-icon">{n.icon}</text>
                  <text x={n.x} y={n.y+16} class="node-title">{n.name}</text>
                  <text x={n.x} y={n.y+36} class="node-sub">{n.sub}</text>
                </g>
              {/each}
              {#if current && origin()}
                {#each destination() as target, j (`${chosen}-${dnsMode}-${stepIndex}-${j}`)}
                  {#if networkPath(current.from, target.id)}
                    <g class="traveler">
                      <circle r="12" fill={p.color} opacity="0.24"><animateMotion dur="2.2s" repeatCount="indefinite" path={networkPath(current.from,target.id)} /></circle>
                      <circle r="6" fill={p.color} stroke="#f6fbff" stroke-width="1.2"><animateMotion dur="2.2s" repeatCount="indefinite" path={networkPath(current.from,target.id)} /></circle>
                    </g>
                  {/if}
                {/each}
              {/if}
            </svg>
            <div class="packet-legend"><span class="legend-dot" style={`background:${p.color}`}></span> ANIMERT PAKKE / MELDING <span class="diagram-caption">Skjematisk illustrasjon · ikke målestokk</span></div>
          </div>
          {#if chosen === 'arp'}
            <div class="live-table"><div><strong>ARP-cache – PC A</strong><small>Oppdateres når ARP Reply kommer frem til PC A</small></div>
              <table><thead><tr><th>IPv4-adresse</th><th>MAC-adresse</th><th>Status</th></tr></thead><tbody>
              <tr class:learned={arpCachePopulated}><td>192.168.1.10</td><td>{arpCachePopulated ? '02:00:00:00:00:10' : 'Ukjent'}</td><td>{arpCachePopulated ? 'Dynamisk · lagret' : 'Ingen oppføring'}</td></tr>
              </tbody></table>
              {#if stepIndex >= 5}<p class="cache-hit">✓ Nytt oppslag: cache-treff! Ingen ny ARP-broadcast nødvendig.</p>{/if}
            </div>
          {:else if chosen === 'nat'}
            <div class="live-table nat-table"><div><strong>NAT / PAT-tabell – ruter</strong><small>Opprettes ved utgående trafikk, brukes ved retur</small></div>
              <table><thead><tr><th>PC</th><th>Lokal IP</th><th>Src-port</th><th>Offentlig IP</th><th>NAT-port</th></tr></thead>
                <tbody>
                {#each natRows as entry}
                  <tr class:lookup={natLookup === entry.nat}><td>{entry.owner}</td><td>{entry.local}</td><td>{entry.src}</td><td>{entry.public}</td><td>{entry.nat}</td></tr>
                {:else}
                  <tr><td colspan="5">Ingen oppføringer ennå – spill av første utgående forbindelse.</td></tr>
                {/each}
                </tbody>
              </table>
              {#if natLookup}
                <p class="nat-result">↳ Returpakke til 203.0.113.5:{natLookup} → tabelloppslag → {natLookup === '40002' ? 'PC B (192.168.1.11:52625)' : 'PC A (192.168.1.10:51514)'}</p>
              {/if}
            </div>
          {:else if chosen === 'dhcp'}
            <div class="live-table"><div><strong>IP-konfigurasjon – klient</strong><small>Verdier fra DHCPACK</small></div>
              <table><thead><tr><th>Felt</th><th>Verdi</th></tr></thead><tbody>
              <tr><td>IPv4-adresse</td><td>{dhcpConfigured ? '192.168.1.100' : 'Ikke tildelt'}</td></tr>
              <tr><td>Gateway</td><td>{dhcpConfigured ? '192.168.1.1' : '–'}</td></tr>
              <tr><td>DNS-server</td><td>{dhcpConfigured ? '192.168.1.2' : '–'}</td></tr>
              </tbody></table>
            </div>
          {/if}
          {#if chosen === 'tcp' || chosen === 'udp'}
            <div class="header-explainer">
              <div class="mini-label">PAKKEOPPBYGNING / TRANSPORTLAGET</div>
              <h3>{chosen === 'tcp' ? 'TCP-header – minst 20 byte' : 'UDP-header – alltid 8 byte'}</h3>
              <p>Hver rad representerer 32 bit (4 byte). Feltene er tegnet i forhold til sin bitbredde. Nyttelasten kommer <strong>etter</strong> headeren.</p>
              {#if chosen === 'tcp'}
                <div class="header-bits">
                  <div class="bit-row"><span style="--bits:16">Kildeport · 16 bit</span><span style="--bits:16">Destinasjonsport · 16 bit</span></div>
                  <div class="bit-row"><span style="--bits:32">Sekvensnummer · 32 bit</span></div>
                  <div class="bit-row"><span style="--bits:32">Acknowledgment Number · 32 bit</span></div>
                  <div class="bit-row"><span style="--bits:4">Data offset · 4</span><span style="--bits:4">Res. · 4</span><span style="--bits:8">Flagg · 8</span><span style="--bits:16">Window Size · 16</span></div>
                  <div class="bit-row"><span style="--bits:16">Checksum · 16 bit</span><span style="--bits:16">Urgent Pointer · 16 bit</span></div>
                  <div class="bit-optional">Options + padding · 0–40 byte (variabelt)</div>
                  <div class="bit-data">Payload · variabel størrelse</div>
                </div>
                <p class="header-note">TCP-headeren er 20–60 byte. Større header betyr mer overhead, men ikke at hver TCP-pakke nødvendigvis er større eller beveger seg saktere enn en UDP-pakke.</p>
              {:else}
                <div class="header-bits">
                  <div class="bit-row"><span style="--bits:16">Kildeport · 16 bit</span><span style="--bits:16">Destinasjonsport · 16 bit</span></div>
                  <div class="bit-row"><span style="--bits:16">Length · 16 bit</span><span style="--bits:16">Checksum · 16 bit</span></div>
                  <div class="bit-data">Payload · variabel størrelse</div>
                </div>
                <p class="header-note">UDP bruker bare 8 byte header. Datagrammets totale størrelse avhenger likevel av nyttelasten, ikke bare protokollheaderen.</p>
              {/if}
            </div>
          {/if}
          <div class="transport-panel">
            <div class="transport-info"><div class="mini-label">AKTIV MELDING</div><div class="transport-title">{current?.label} <span class="transport-heading">{current?.title}</span></div><p>{current?.explanation}</p></div>
            <div class="transport-controls"><button aria-label="Forrige steg" title="Forrige steg" onclick={previous}>‹</button><button class="playbutton" aria-label={playing ? 'Pause' : 'Spill av'} onclick={() => playing = !playing}>{playing ? 'Ⅱ' : '▶'}</button><button aria-label="Neste steg" title="Neste steg" onclick={next}>›</button><button aria-label="Start på nytt" title="Start på nytt" onclick={reset}>↺</button></div>
          </div>
          <div class="step-dots">
            {#each activeSteps as s, i}<button class:current={stepIndex===i} title={`Steg ${i+1}: ${s.title}`} aria-label={`Gå til steg ${i+1}`} onclick={() => {stepIndex=i; playing=false;}}></button>{/each}
            <span class="speed-label">Hastighet</span><select aria-label="Hastighet" value={speed} onchange={e => speed = Number(e.currentTarget.value)}><option value={5000}>Rolig</option><option value={3400}>Normal</option><option value={2000}>Rask</option></select>
          </div>
          <button class="packet-toggle" onclick={() => showPacket = !showPacket} aria-expanded={showPacket}><span>⌁ &nbsp;Se innholdet i meldingen / pakken</span><span>{showPacket?'−':'+'}</span></button>
          {#if showPacket}<div class="packet-detail">{#each current?.packet ?? [] as item}<div>{item}</div>{/each}</div>{/if}
        </section>
        <section class="learning-grid">
          <div class="card theory-card"><div class="section-kicker">FAGSTOFF</div><h2>Dette må du forstå</h2><ul>{#each p.points as point}<li>{point}</li>{/each}</ul></div>
          <div class="card cmds-card"><div class="section-kicker">PRAKTISK VERKTØY</div><h2>Prøv i Windows</h2><p>Åpne CMD eller PowerShell og undersøk nettverket.</p>{#each p.commands as cmd}<div class="command"><code>{cmd.code}</code><button onclick={() => navigator.clipboard?.writeText(cmd.code)} title="Kopier kommando" aria-label={`Kopier ${cmd.code}`}>⧉</button><small>{cmd.detail}</small></div>{/each}<div class="tip">⚑ &nbsp;Kjør kommandoer som endrer nettverksoppsett bare når det er trygt på PC-en du bruker.</div></div>
        </section>
        <section class="card exercise-card"><div class="section-kicker">ØVINGSOPPGAVER</div><h2>Test forståelsen</h2><p>Velg svar. Du får umiddelbar tilbakemelding på hvorfor det er riktig eller feil.</p>
          <div class="questions">{#each p.questions as question, i}
            {@const key = `${chosen}-${i}`}
            <div class="question"><div class="question-top"><span>OPPGAVE {String(i+1).padStart(2,'0')}</span><strong>{question.question}</strong></div>
            <div class="choices">{#each question.choices as choice, j}
              <button disabled={revealed[key]} class:selected={answers[key] === j} class:correct={revealed[key] && j===question.correct} class:incorrect={revealed[key] && answers[key]===j && j!==question.correct} onclick={() => chooseAnswer(i, j)}><span class="choice-letter">{String.fromCharCode(65+j)}</span>{choice}{#if revealed[key] && j===question.correct}<span class="answer-icon">✓</span>{/if}</button>
            {/each}</div>
            {#if revealed[key]}<div class:good={answers[key]===question.correct} class="feedback">{answers[key]===question.correct?'Riktig!':'Ikke helt.'} {question.explanation}</div>{/if}
            </div>
          {/each}</div>
          <div class="challenge"><div class="section-kicker">UTFORSK SELV</div><h3>Praktisk oppgave</h3><p>{p.challenge}</p></div>
          <div class="exercise-footer"><span>{p.questions.filter((_,i) => revealed[`${chosen}-${i}`] && answers[`${chosen}-${i}`]===p.questions[i].correct).length} av {p.questions.length} riktige</span><button class="secondary" onclick={() => { const a={...answers}, r={...revealed}; p.questions.forEach((_,i) => { delete a[`${chosen}-${i}`]; delete r[`${chosen}-${i}`] }); answers=a; revealed=r; }}>Prøv oppgavene på nytt ↺</button></div>
        </section>
        <div class="next-module">{#if protocolList.indexOf(p) < protocolList.length - 1}<span>KLAR FOR NESTE EMNE?</span><button class="primary" onclick={() => openProtocol(protocolList[protocolList.indexOf(p)+1].id)}>Neste: {protocolList[protocolList.indexOf(p)+1].name} →</button>{:else}<span>DU HAR VÆRT GJENNOM ALLE EMNENE</span><button class="primary" onclick={() => openProtocol('intro')}>Til oversikten ↗</button>{/if}</div>
      {/if}
      <footer>DRIFTSSTØTTE · MODUL PROTOKOLLER <span>Illustrasjonene er forenklede undervisningseksempler med dokumentasjonsadresser. Reell pakketrafikk kan variere.</span></footer>
    </main>
  </div>
</div>

<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap');
.shell{font-family:inherit;color:#e8edf7;background:#0a111c;font-synthesis:none}*{box-sizing:border-box}button,select{font:inherit}button{cursor:pointer}button:disabled{cursor:default}button:focus-visible,select:focus-visible{outline:2px solid #7bb7ff;outline-offset:3px} .shell{display:flex;min-height:100vh}aside{position:sticky;top:0;width:271px;flex:0 0 271px;height:100vh;overflow:auto;background:#0c1522;border-right:1px solid #233044;padding:27px 16px;display:flex;flex-direction:column;z-index:20}.brand{display:flex;align-items:center;gap:11px;padding:3px 8px 33px}.brand-symbol{display:grid;place-items:center;font-size:27px;width:39px;height:39px;border:1px solid #548ee5;border-radius:12px;color:#7fb3ff;background:#172940}.brand strong{display:block;font-size:12px;letter-spacing:.13em}.brand span{display:block;font-size:11px;color:#8294af;margin-top:5px}.aside-heading{color:#687f9f;font:700 10px 'Space Mono',monospace;letter-spacing:.12em;padding:10px 13px 14px}.protoheading{padding-top:28px}.navbtn{display:flex;align-items:center;text-align:left;gap:11px;width:100%;border:1px solid transparent;border-radius:9px;padding:12px 12px;background:transparent;color:#aab8ce;min-height:48px}.navbtn:hover{background:#14243a;color:white}.navbtn.active{background:#18314f;color:#d5e8ff;border-color:#284769}.nav-icon{font-size:20px;width:22px;text-align:center}.nav-number{font:700 11px 'Space Mono',monospace;color:#6b85a7;width:22px}.nav-text{display:flex;flex-direction:column;flex:1;gap:3px}.nav-text strong{font-size:14px}.nav-text small{font-size:10px;color:#7e91ab}.nav-chevron{color:#607b9b}.sidebar-note{margin-top:auto;font-size:11px;color:#6f87a2;padding:25px 10px 0}.status-dot{display:inline-block;background:#58d2b3;border-radius:50%;width:7px;height:7px;margin-right:5px}.main-layout{min-width:0;width:100%}.topbar{height:71px;padding:0 clamp(23px,4vw,65px);border-bottom:1px solid #202e40;display:flex;align-items:center;justify-content:space-between;font:700 10px 'Space Mono',monospace;letter-spacing:.085em;color:#8da5c5}.crumb-sep{color:#48617f;margin:0 9px}.header-pill{border:1px solid #2a405b;border-radius:20px;padding:8px 12px;color:#8bb7e7}main{max-width:1260px;margin:0 auto;padding:46px clamp(22px,4vw,62px) 0}.menu-toggle{display:none;background:none;color:white;border:0;font-size:23px}.eyebrow,.section-kicker{font:700 11px 'Space Mono',monospace;color:#72b8fb;letter-spacing:.13em}.spark{color:#60ddbd;margin-right:8px}.hero{padding:54px 0 28px}.hero h1,.protocol-header h1{font-size:clamp(48px,5.8vw,80px);line-height:1.05;letter-spacing:-.06em;margin:22px 0 26px;font-weight:800}.hero h1 em{color:#76adfb;font-style:normal}.hero p,.protocol-header>p{font-size:17px;max-width:670px;color:#a6b5ca;line-height:1.78}.hero p strong{color:#e4ecf7}.primary{display:inline-flex;align-items:center;gap:25px;border:0;background:#7baef5;color:#071323;padding:15px 21px;border-radius:8px;font-weight:800;margin-top:21px}.primary:hover{background:#9cc6ff}.intro-diagram{display:flex;align-items:center;justify-content:space-between;background:radial-gradient(ellipse at 50% 70%,#1b314a,#101c2c 70%);border:1px solid #304056;border-radius:15px;padding:40px 32px;margin:24px 0 65px;overflow:hidden}.mini-device{border:1px solid #345373;border-radius:12px;text-align:center;background:#17283e;padding:17px 23px;min-width:130px}.mini-device>span{display:block;font-size:34px;margin-bottom:11px}.mini-device strong{display:block;font-size:13px}.mini-device small{display:block;color:#7c99b8;font-size:10px;margin-top:7px}.mini-wire{flex:1;min-width:40px;border-top:2px dashed #4e7092;position:relative}.mini-packet{position:absolute;top:-26px;left:15%;font:10px 'Space Mono',monospace;color:#83c4fa;white-space:nowrap;animation:float 4s ease-in-out infinite}.mini-packet.second{animation-delay:-2s}@keyframes float{0%,100%{transform:translateX(0)}50%{transform:translateX(26px)}}.intro-content{padding-bottom:40px}.intro-content h2,.card h2{font-size:29px;letter-spacing:-.04em;margin:12px 0 16px}.intro-content>p{color:#a3b3c8;line-height:1.75;max-width:850px}.protocol-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin:31px 0}.protocol-tile{background:#121f30;border:1px solid #2c3e56;color:white;min-height:156px;border-radius:11px;text-align:left;padding:19px;position:relative;display:flex;flex-direction:column;gap:8px}.protocol-tile:hover{border-color:var(--tile);transform:translateY(-2px)}.tile-index{font:11px 'Space Mono',monospace;color:var(--tile)}.protocol-tile strong{font-size:23px}.protocol-tile>span:nth-of-type(2){font-size:12px;line-height:1.4;color:#97a9be;max-width:165px}.tile-arrow{position:absolute;right:17px;top:18px;color:var(--tile);font-size:18px}.notice{border-left:3px solid #7baef5;background:#122135;padding:17px 20px;color:#9fb5ce;line-height:1.65;font-size:13px}.notice strong{color:#d8eafa}.protocol-header{padding:12px 0 34px}.protocol-header h1{margin:12px 0 8px;font-size:clamp(58px,7vw,88px)}.heading-row{display:flex;align-items:center;justify-content:space-between;gap:20px}.heading-dot{display:inline-block;width:13px;height:13px;border-radius:50%;margin-left:19px;vertical-align:middle}.subtitle{font-size:16px;color:#93abca}.pill-stack{display:flex;flex-direction:column;align-items:flex-end;gap:8px;max-width:310px}.pill-stack span{font:11px 'Space Mono',monospace;color:#9babc4;background:#172438;border:1px solid #30435f;border-radius:20px;padding:8px 12px;text-align:right}.protocol-header>p{font-size:15px;max-width:920px;margin:25px 0 0}.card{background:#111d2d;border:1px solid #28384e;border-radius:14px;overflow:hidden}.animation-card{margin-bottom:20px}.card-titlebar{display:flex;align-items:center;justify-content:space-between;padding:26px 28px 15px}.card-titlebar h2{margin:8px 0 0}.step-count{font:11px 'Space Mono',monospace;color:#8ca4c3}.step-count strong{color:#fff}.network{margin:0 21px;border:1px solid #233b56;border-radius:10px;background:radial-gradient(ellipse at 50% 55%,#1b324c 0%,#101d2d 70%);overflow:hidden}.network svg{display:block;width:100%;height:auto;max-height:390px;min-height:220px}.cable{stroke:#47617e;stroke-width:2;stroke-dasharray:6 6}.node-box{fill:#17283d;stroke:#42607e;stroke-width:1.5}.node-active .node-box{stroke:var(--accent);stroke-width:2.5}.node-icon{text-anchor:middle;dominant-baseline:central;font-size:20px}.node-title{text-anchor:middle;fill:#e5effb;font-size:13px;font-weight:700}.node-sub{text-anchor:middle;fill:#8ca7c7;font-size:10px;font-family:'Space Mono',monospace}.packet-legend{display:flex;align-items:center;gap:8px;font:10px 'Space Mono',monospace;color:#a7bfd9;border-top:1px solid #2a4159;padding:12px 17px}.legend-dot{width:8px;height:8px;border-radius:50%}.diagram-caption{margin-left:auto;color:#5f7a97;text-transform:none}.transport-panel{display:flex;justify-content:space-between;gap:20px;align-items:center;padding:25px 28px 15px}.transport-info{max-width:700px}.mini-label{font:10px 'Space Mono',monospace;letter-spacing:.1em;color:#7092b9}.transport-title{font-size:21px;font-weight:800;margin:5px 0}.transport-heading{font-size:15px;color:#93acc8;font-weight:500;margin-left:10px}.transport-info p{font-size:13px;color:#a8bad0;line-height:1.7;margin:8px 0 0}.transport-controls{display:flex;gap:7px;flex-shrink:0}.transport-controls button{width:39px;height:39px;background:#203249;border:1px solid #35516e;color:#cae1fc;border-radius:9px;font-size:23px}.transport-controls .playbutton{background:#7baef5;color:#102137;border-color:#7baef5;font-size:16px}.transport-controls button:hover{filter:brightness(1.18)}.step-dots{padding:4px 28px 20px;display:flex;align-items:center;gap:7px}.step-dots button{border:0;width:8px;height:8px;border-radius:5px;background:#354b64;padding:0}.step-dots button.current{background:#8ebcfe;width:29px}.speed-label{font-size:11px;color:#728aa7;margin-left:auto}.step-dots select{background:#1b2d42;border:1px solid #344b64;color:#d1e1f1;border-radius:6px;font-size:11px;padding:5px}.packet-toggle{display:flex;justify-content:space-between;width:100%;border:0;border-top:1px solid #293b50;background:#142237;color:#c7daee;text-align:left;padding:15px 28px;font-size:13px;font-weight:700}.packet-detail{display:flex;gap:9px;flex-wrap:wrap;padding:16px 26px 22px;background:#0f1c2b}.packet-detail div{font:11px 'Space Mono',monospace;background:#1c3148;color:#b8d6f6;border:1px solid #35506a;border-radius:6px;padding:9px 11px;overflow-wrap:anywhere}.learning-grid{display:grid;grid-template-columns:1.35fr 1fr;gap:20px;margin:20px 0}.theory-card,.cmds-card{padding:29px}.theory-card ul{padding-left:21px;margin:24px 0 0;color:#aebdd0;line-height:1.68;font-size:14px}.theory-card li{padding:0 0 13px 4px}.theory-card li::marker{color:#78b2ff}.cmds-card>p,.exercise-card>p{font-size:13px;color:#9badc3;line-height:1.7}.command{background:#0d1927;border:1px solid #2d4059;border-radius:8px;margin:12px 0;padding:12px;position:relative}.command code{display:block;color:#86d8b9;font:12px 'Space Mono',monospace;overflow-wrap:anywhere;padding-right:25px}.command small{display:block;color:#879ab3;margin-top:8px;line-height:1.5}.command button{position:absolute;right:9px;top:6px;background:none;border:0;color:#9ab8d7;font-size:19px}.tip{font-size:11px;color:#8c9db2;line-height:1.6;margin-top:18px}.exercise-card{padding:30px;margin:20px 0}.exercise-card h2{margin-top:10px}.questions{display:grid;gap:25px;margin-top:28px}.question{padding-bottom:25px;border-bottom:1px solid #2d3f53}.question-top>span{display:block;font:10px 'Space Mono',monospace;color:#6ea7e9;margin-bottom:9px}.question-top strong{font-size:16px}.choices{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:17px}.choices button{border:1px solid #30465e;border-radius:8px;padding:13px;background:#18273b;color:#c1d0e2;text-align:left;font-size:12px;line-height:1.5;display:flex;gap:9px;align-items:start;position:relative}.choices button:not(:disabled):hover{border-color:#80abda}.choices button.correct{border-color:#58ba97;background:#13382f;color:#e1fff5}.choices button.incorrect{border-color:#ce7777;background:#3e272b}.choice-letter{display:grid;place-items:center;min-width:20px;height:20px;border-radius:5px;background:#29415b;font:11px 'Space Mono',monospace}.answer-icon{margin-left:auto;color:#72dfb8}.feedback{margin-top:12px;background:#3a2828;border-radius:6px;padding:12px 14px;color:#f6cecc;font-size:12px;line-height:1.6}.feedback.good{background:#183a32;color:#b8ebd4}.challenge{background:#1a2d42;border:1px solid #355370;border-radius:10px;padding:21px;margin-top:29px}.challenge h3{font-size:20px;margin:11px 0}.challenge p{color:#b3c6dc;line-height:1.7;font-size:13px;margin-bottom:0}.exercise-footer{display:flex;justify-content:space-between;align-items:center;gap:20px;margin-top:20px;font-size:12px;color:#a0b5ce}.secondary{border:1px solid #426184;background:transparent;color:#bddaff;border-radius:7px;padding:10px 15px;font-weight:700}.next-module{display:flex;align-items:center;justify-content:space-between;margin:39px 0 64px;gap:15px}.next-module span{color:#7796b5;font:10px 'Space Mono',monospace;letter-spacing:.08em}.next-module .primary{margin-top:0}footer{border-top:1px solid #29394d;padding:28px 0 35px;font:10px 'Space Mono',monospace;color:#7390ae;display:flex;justify-content:space-between;gap:20px;line-height:1.6}footer span{max-width:600px;text-align:right}
@media(max-width:1150px){.protocol-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.learning-grid{grid-template-columns:1fr}.choices{grid-template-columns:1fr}.transport-panel{flex-wrap:wrap}.pill-stack{max-width:220px}.intro-diagram{padding:25px 12px}.mini-device{padding:12px;min-width:110px}}@media(max-width:780px){aside{position:fixed;left:0;transform:translateX(-105%);transition:transform .2s;box-shadow:10px 0 40px #0008}aside.open{transform:translateX(0)}.scrim{position:fixed;inset:0;background:#0009;border:0;z-index:19}.menu-toggle{display:block}.topbar{gap:14px;padding:0 20px}.header-pill{display:none}main{padding:29px 19px 0}.hero{padding-top:33px}.hero h1{font-size:clamp(42px,9vw,65px)}.protocol-header h1{font-size:65px}.heading-row{align-items:flex-start;flex-direction:column}.pill-stack{align-items:flex-start;max-width:100%}.pill-stack span{text-align:left}.intro-diagram{gap:5px}.mini-device{min-width:0;padding:9px 8px}.mini-device>span{font-size:24px}.mini-device strong{font-size:11px}.mini-device small{font-size:8px}.mini-packet{display:none}.protocol-grid{gap:10px}.protocol-tile{min-height:140px;padding:13px}.card-titlebar,.transport-panel,.theory-card,.cmds-card,.exercise-card{padding:20px}.network{margin:0 10px}.network svg{min-height:180px}.step-dots{padding-left:20px;padding-right:20px}.packet-toggle{padding:15px 20px}.transport-controls button{width:36px;height:36px}.next-module{flex-direction:column;align-items:flex-start}footer{flex-direction:column}footer span{text-align:left}}@media(prefers-reduced-motion:reduce){.mini-packet{animation:none}}

/* Interaktive protokollillustrasjoner v2 */
.scenario-tabs{display:flex;gap:9px;padding:0 22px 15px;flex-wrap:wrap}
.scenario-tabs button{background:#182b42;color:#a9c5e3;border:1px solid #355371;border-radius:8px;padding:11px 15px;cursor:pointer}
.scenario-tabs button.chosen{background:#2c5273;color:#fff;border-color:#8ac6ed}
.lesson-analogy{margin:0 22px 17px;padding:15px 18px;border-left:3px solid #58d2b3;background:#142e39;color:#c4dee7;border-radius:5px;font-size:13px;line-height:1.7}
.lesson-analogy strong{color:#eefff8}
.live-table{margin:18px 22px 8px;background:#102438;border:1px solid #36516b;border-radius:10px;padding:16px 18px;overflow:auto}
.live-table>div:first-child{display:flex;gap:12px;flex-wrap:wrap;justify-content:space-between;align-items:center}
.live-table strong{color:#e6f3ff}.live-table small{color:#91aac4}
.live-table table{border-collapse:collapse;width:100%;margin-top:13px;color:#c2d8ef;font-size:12px;text-align:left}
.live-table th,.live-table td{padding:9px 12px;border-bottom:1px solid #2c4760}
.live-table th{color:#8eabc8;font-size:11px}
.live-table tr.learned td{color:#82efc6;background:#163b39}
.live-table .cache-hit{font-size:12px;color:#8decba;margin:12px 0 0}

/* v3 – internettsky, headers og levende PAT-tabell */
.internet-cloud{fill:#152a40;stroke:#627f9a;stroke-width:1.5;stroke-dasharray:7 5;opacity:.78}
.cloud-label{fill:#b7cce5;text-anchor:middle;font:700 11px system-ui,sans-serif;letter-spacing:1.4px}
.nat-table{border-color:#816344;background:#272437}
.nat-table .lookup td{background:#483b2a;color:#ffe1a5;font-weight:700}
.nat-result{font-size:12px;color:#ffd18d;line-height:1.6}
.header-explainer{margin:18px 22px 5px;padding:19px 20px;background:#102638;border:1px solid #36536f;border-radius:10px}
.header-explainer h3{margin:9px 0;font-size:19px;color:#e8f1fc}
.header-explainer p{color:#a8bdd1;font-size:12px;line-height:1.6}
.header-bits{max-width:850px;margin:17px auto 10px;border:1px solid #496786;border-radius:7px;overflow:hidden}
.bit-row{display:flex;min-height:47px;background:#224363}
.bit-row + .bit-row{border-top:1px solid #7294b2}
.bit-row>span{flex:var(--bits) 1 0;min-width:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:7px 3px;color:#f1f6ff;font:600 11px system-ui,sans-serif;overflow-wrap:anywhere}
.bit-row>span+span{border-left:1px solid #7294b2}
.bit-row:nth-child(even){background:#29496b}
.bit-optional{padding:12px;text-align:center;background:#3b365a;color:#e2daff;border-top:2px dashed #a3a0c6;font-size:12px}
.bit-data{padding:15px;text-align:center;background:#194436;color:#b6f5d1;border-top:2px solid #559f7a;font-size:12px}
.header-note{margin-top:13px!important}
@media(max-width:780px){.header-explainer{margin:12px 10px;padding:13px}.bit-row>span{font-size:9px}.nat-table table{min-width:510px}}

/* Keep the supplied module isolated below IT-laben’s shared navigation. */
.shell { isolation:isolate; }
aside { top:70px; height:calc(100dvh - 70px); }
@media(max-width:780px) { aside { top:70px; bottom:0; } }


/* Kompakt modulmeny: én tittel, tydelig aktivt emne og mindre visuell støy. */
.shell > aside { padding: 0 12px 16px; width: 246px; flex-basis: 246px; gap: 0; }
.sidebar-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; padding: 22px 12px 18px; border-bottom: 1px solid #26374c; }
.sidebar-heading { display: grid; gap: 5px; min-width: 0; }
.sidebar-eyebrow { color: #8ea5c1; font-size: 10px; font-weight: 700; letter-spacing: .11em; }
.sidebar-heading strong { font-size: 20px; letter-spacing: -.025em; color: #f0f5ff; }
.sidebar-subtitle { color: #94a8c2; font-size: 12px; }
.sidebar-close { display: none; color: #c4d8ef; background: transparent; border: 0; border-radius: 8px; font-size: 27px; line-height: 1; width: 36px; height: 36px; }
.protocol-nav { display: grid; gap: 3px; padding-top: 12px; }
.protocol-nav .aside-heading { padding: 16px 12px 8px; font-size: 10px; color: #91a6c0; }
.protocol-nav .navbtn { position: relative; gap: 10px; min-height: 43px; padding: 10px 11px; border-radius: 8px; }
.protocol-nav .navbtn.active { background: #1c354f; border-color: #41688e; }
.protocol-nav .navbtn.active::before { content: ''; position: absolute; left: 0; top: 9px; bottom: 9px; width: 3px; border-radius: 3px; background: #82bcff; }
.protocol-nav .nav-number { width: 25px; flex: 0 0 25px; color: #91aac9; font-size: 11px; }
.protocol-nav .navbtn.active .nav-number { color: #b9d9ff; }
.protocol-nav .nav-text { min-width: 0; gap: 4px; }
.protocol-nav .nav-text strong { font-size: 14px; line-height: 1.3; }
.protocol-nav .nav-text small { color: #adc3da; font-size: 11px; line-height: 1.4; }
.protocol-nav .nav-chevron { margin-left: auto; font-size: 17px; opacity: .55; }
.protocol-nav .navbtn.active .nav-chevron { opacity: 1; color: #b9d9ff; }
.protocol-nav .intro-link { margin-bottom: 3px; }
.protocol-nav .nav-icon { font-size: 18px; flex: 0 0 25px; }
.sidebar-back { display: block; margin: 18px 10px 0; padding: 13px 2px; border-top: 1px solid #26374c; color: #a9bfdb; font-size: 12px; text-decoration: none; }
.sidebar-back:hover { color: #e5f1ff; }
@media (max-width: 780px) {
  .shell > aside { width: min(290px, 85vw); flex-basis: auto; }
  .sidebar-close { display: grid; place-items: center; }
  .protocol-nav .navbtn { min-height: 48px; }
}

</style>
