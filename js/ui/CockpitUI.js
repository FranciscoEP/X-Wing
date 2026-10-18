import { ALERTS, buildBannerModel, buildEndModel, buildHudModel, buildMenuModel, formatScore } from './viewModel.js';

const ALERT_LIFETIME = 2.6; // s, igual que la animación CSS `alert-life`
const MAX_ALERTS = 3;

/**
 * Pinta la interfaz de cabina (HTML+CSS) a partir del estado del juego.
 * Calcula el contenido con las funciones puras de viewModel.js y solo toca el DOM cuando un
 * valor cambia, para no forzar recálculos de estilo en cada frame.
 *
 * `actions`: { start, resume, menu, selectDifficulty(key) } — los botones llaman a Game.
 */
export class CockpitUI {
  constructor(root, { actions, playerIcon, onAction = () => {} }) {
    this.root = root;
    this.actions = actions;
    this.playerIcon = playerIcon;
    this.onAction = onAction;
    this.refs = Object.fromEntries([...root.querySelectorAll('[data-ref]')].map((el) => [el.dataset.ref, el]));
    this.cache = new Map();
    this.alerts = [];
    this.time = 0;

    root.addEventListener('click', (e) => this.handleClick(e));
  }

  handleClick(e) {
    const difficulty = e.target.closest('[data-difficulty]');
    if (difficulty) this.actions.selectDifficulty(difficulty.dataset.difficulty);
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action) this.actions[action]?.();
    if (difficulty || action) this.onAction();
  }

  /** Suscribe los avisos tácticos a los eventos de una nueva partida. */
  attach(world) {
    this.clearAlerts();
    for (const [event, toAlert] of Object.entries(ALERTS)) {
      world.events.on(event, (payload) => {
        const alert = toAlert(payload);
        if (alert) this.pushAlert(alert);
      });
    }
  }

  /** `scene` es el mismo objeto que recibe el Renderer (ver Game.scene()). */
  update(scene) {
    this.time = scene.time;
    this.set('state', scene.state, (state) => (this.root.dataset.state = state));

    switch (scene.state) {
      case 'menu':
        this.renderMenu(scene);
        break;
      case 'playing':
      case 'paused':
        this.renderHud(buildHudModel(scene.world, scene));
        this.renderBanner(scene.state === 'playing' ? buildBannerModel(scene.world.phases) : null);
        this.expireAlerts();
        break;
      case 'gameover':
      case 'victory':
        this.renderBanner(null);
        this.renderEnd(buildEndModel(scene.world, { ...scene, victory: scene.state === 'victory' }));
        break;
    }
  }

  // --------------------------------------------------------------- helpers

  /** Ejecuta `apply(value)` solo si `value` cambió desde la última vez para esta clave. */
  set(key, value, apply) {
    if (this.cache.get(key) === value) return;
    this.cache.set(key, value);
    apply(value);
  }

  text(ref, value) {
    this.set(`text:${ref}`, value, (v) => (this.refs[ref].textContent = v));
  }

  meter(ref, ratio) {
    const rounded = Math.round(Math.max(0, Math.min(1, ratio)) * 1000) / 1000;
    this.set(`meter:${ref}`, rounded, (v) => this.refs[ref].style.setProperty('--value', v));
  }

  show(ref, visible) {
    this.set(`show:${ref}`, visible, (v) => (this.refs[ref].hidden = !v));
  }

  // --------------------------------------------------------------- pantallas

  renderMenu(scene) {
    const model = buildMenuModel(scene);
    this.set('menu:difficulties', JSON.stringify(model.difficulties), () => {
      this.refs.difficulties.replaceChildren(
        ...model.difficulties.map((d) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'difficulty';
          button.setAttribute('role', 'radio');
          button.setAttribute('aria-checked', String(d.selected));
          button.dataset.difficulty = d.key;
          button.innerHTML = `<span></span><small></small>`;
          button.firstChild.textContent = d.label;
          button.lastChild.textContent = `${d.lives} naves`;
          return button;
        })
      );
    });
    this.text('menuRecord', model.highScore > 0 ? `Récord: ${formatScore(model.highScore)}` : '');
  }

  renderHud(m) {
    const hull = this.refs.hull;
    this.set('faded:hull', m.faded.hull, (v) => (hull.closest('.hud-hull').dataset.faded = v));
    this.set('faded:score', m.faded.score, (v) => (this.refs.score.closest('.hud-score').dataset.faded = v));
    this.meter('hull', m.hpRatio);
    this.set('hull:level', m.hpLevel, (v) => (hull.dataset.level = v));
    this.set('hull:aria', Math.round(m.hpRatio * 100), (v) => hull.setAttribute('aria-valuenow', v));

    this.set('lives', m.lives, (n) => {
      this.refs.lives.replaceChildren(
        ...Array.from({ length: n }, () => Object.assign(document.createElement('img'), { src: this.playerIcon, alt: '' }))
      );
      this.refs.lives.setAttribute('aria-label', `${n} naves`);
    });
    this.set('torpedoes', m.torpedoes, (n) => {
      this.refs.torpedoes.replaceChildren(...Array.from({ length: n }, () => Object.assign(document.createElement('span'), { className: 'pip' })));
      this.refs.torpedoes.setAttribute('aria-label', `${n} torpedos`);
    });

    this.text('score', formatScore(m.score));
    this.text('highScore', formatScore(m.highScore));
    this.text('phase', m.phase ? `Fase ${m.phase.number}/${m.phase.total} · ${m.phase.name}` : '');

    this.show('boss', Boolean(m.boss));
    if (m.boss) {
      this.text('bossName', m.boss.name);
      this.meter('bossFill', m.boss.ratio);
      this.set('boss:enraged', m.boss.enraged, (v) => (this.refs.boss.dataset.enraged = v));
      this.set('boss:shielded', m.boss.shielded, (v) => (this.refs.boss.dataset.shielded = v));
    }

    this.show('wave', Boolean(m.wave));
    if (m.wave) {
      this.meter('waveFill', m.wave.ratio);
      this.text('waveCount', `${m.wave.done} / ${m.wave.total}`);
    }

    this.renderPowerUps(m.powerUps);
  }

  renderPowerUps(powerUps) {
    this.set('powerUps', powerUps.map((p) => p.type).join(','), () => {
      this.refs.powerUps.replaceChildren(
        ...powerUps.map((p) => {
          const li = document.createElement('li');
          li.className = 'powerup';
          li.dataset.type = p.type;
          li.style.setProperty('--c', p.color);
          li.innerHTML = '<span class="powerup-ring"></span><span></span>';
          li.firstChild.dataset.icon = p.icon;
          li.lastChild.textContent = p.label;
          return li;
        })
      );
    });
    // El anillo se actualiza cada frame, pero solo como variable CSS
    for (const li of this.refs.powerUps.children) {
      const p = powerUps.find((x) => x.type === li.dataset.type);
      if (p) li.style.setProperty('--p', Math.round(p.ratio * 100) / 100);
    }
  }

  renderBanner(model) {
    this.show('banner', Boolean(model));
    if (!model) return;
    this.set('banner:key', model.key, () => {
      this.refs.bannerKicker.textContent = model.kicker;
      this.refs.bannerTitle.textContent = model.title;
      this.refs.bannerSubtitle.textContent = model.subtitle;
      // Reinicia la animación CSS para cada cartel nuevo
      const el = this.refs.banner;
      el.style.animation = 'none';
      void el.offsetWidth;
      el.style.animation = '';
    });
  }

  renderEnd(m) {
    this.text('endTitle', m.title);
    this.text('endSubtitle', m.subtitle);
    this.text('endScore', m.score);
    this.text('endRecord', m.newRecord ? '¡Nuevo récord!' : `Récord ${m.highScore}`);
    this.set('end:new', m.newRecord, (v) => (this.refs.endRecord.dataset.new = v));
    this.set('end:stats', JSON.stringify(m.stats), () => {
      this.refs.endStats.replaceChildren(
        ...m.stats.map(({ label, value }) => {
          const div = document.createElement('div');
          div.innerHTML = '<dt></dt><dd></dd>';
          div.firstChild.textContent = label;
          div.lastChild.textContent = value;
          return div;
        })
      );
    });
  }

  // --------------------------------------------------------------- avisos

  pushAlert({ text, tone }) {
    const el = document.createElement('p');
    el.className = 'alert';
    el.dataset.tone = tone;
    el.textContent = text;
    this.refs.alerts.append(el);
    this.alerts.push({ el, until: this.time + ALERT_LIFETIME });
    while (this.alerts.length > MAX_ALERTS) this.alerts.shift().el.remove();
  }

  expireAlerts() {
    while (this.alerts.length && this.alerts[0].until <= this.time) this.alerts.shift().el.remove();
  }

  clearAlerts() {
    for (const a of this.alerts) a.el.remove();
    this.alerts = [];
  }
}
