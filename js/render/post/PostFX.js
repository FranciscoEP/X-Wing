import { packWaves, MAX_WAVES } from './uniforms.js';

/**
 * Post-procesado en WebGL2 sobre la imagen del canvas 2D:
 *   1. bright pass   → aísla lo luminoso (láseres, motores, explosiones)
 *   2. blur ×2 tamaños (½ y ¼ de resolución) → bloom suave y amplio
 *   3. composición  → escena + bloom y ondas de choque (distorsión en anillo)
 * Si el navegador no tiene WebGL2, `PostFX.create` devuelve null y el juego se ve sin él.
 */

const VERTEX = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const BRIGHT = `#version 300 es
precision mediump float;
in vec2 vUv;
uniform sampler2D uTex;
uniform float uThreshold;
uniform float uKnee;
out vec4 outColor;
void main() {
  vec3 c = texture(uTex, vUv).rgb;
  float l = max(c.r, max(c.g, c.b));
  float soft = clamp(l - uThreshold + uKnee, 0.0, 2.0 * uKnee);
  soft = soft * soft / (4.0 * uKnee + 1e-4);
  float k = max(soft, l - uThreshold) / max(l, 1e-4);
  outColor = vec4(c * k, 1.0);
}`;

const BLUR = `#version 300 es
precision mediump float;
in vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uStep;
out vec4 outColor;
void main() {
  // Gauss de 9 muestras
  vec3 c = texture(uTex, vUv).rgb * 0.227027;
  c += texture(uTex, vUv + uStep * 1.0).rgb * 0.1945946;
  c += texture(uTex, vUv - uStep * 1.0).rgb * 0.1945946;
  c += texture(uTex, vUv + uStep * 2.0).rgb * 0.1216216;
  c += texture(uTex, vUv - uStep * 2.0).rgb * 0.1216216;
  c += texture(uTex, vUv + uStep * 3.0).rgb * 0.054054;
  c += texture(uTex, vUv - uStep * 3.0).rgb * 0.054054;
  c += texture(uTex, vUv + uStep * 4.0).rgb * 0.016216;
  c += texture(uTex, vUv - uStep * 4.0).rgb * 0.016216;
  outColor = vec4(c, 1.0);
}`;

const COMPOSITE = `#version 300 es
precision mediump float;
in vec2 vUv;
uniform sampler2D uScene;
uniform sampler2D uBloomNear;
uniform sampler2D uBloomFar;
uniform float uAspect;
uniform float uBloomNearStrength;
uniform float uBloomFarStrength;
uniform vec4 uWaves[${MAX_WAVES}]; // x, y (uv), radio (en alto de pantalla), fuerza
uniform int uWaveCount;
out vec4 outColor;

void main() {
  // Ondas expansivas: desplazan la imagen en un anillo
  vec2 offset = vec2(0.0);
  for (int i = 0; i < ${MAX_WAVES}; i++) {
    if (i >= uWaveCount) break;
    vec4 w = uWaves[i];
    vec2 d = vUv - w.xy;
    d.x *= uAspect;
    float dist = length(d);
    float ring = smoothstep(0.06, 0.0, abs(dist - w.z));
    offset += (dist > 1e-4 ? d / dist : vec2(0.0)) * ring * w.w * 0.025 * vec2(1.0 / uAspect, 1.0);
  }
  vec2 uv = vUv - offset;

  vec3 scene = texture(uScene, uv).rgb;
  vec3 bloom = texture(uBloomNear, uv).rgb * uBloomNearStrength + texture(uBloomFar, uv).rgb * uBloomFarStrength;
  vec3 color = scene + bloom;

  // Recorte suave de altas luces (evita blancos quemados)
  color = color / (1.0 + max(vec3(0.0), color - 1.0));
  outColor = vec4(color, 1.0);
}`;

/** Solo brilla lo muy luminoso (láseres, motores, explosiones): el resto de la escena no cambia. */
export const POST_DEFAULTS = {
  threshold: 0.7,
  knee: 0.2,
  bloomNear: 0.8,
  bloomFar: 0.5,
};

export class PostFX {
  /** Crea el post-procesado sobre `canvas`, o devuelve null si no hay WebGL2. */
  static create(canvas, options) {
    const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: false });
    if (!gl) return null;
    try {
      return new PostFX(gl, options);
    } catch (error) {
      console.warn('PostFX desactivado:', error);
      return null;
    }
  }

  constructor(gl, options = {}) {
    this.gl = gl;
    this.options = { ...POST_DEFAULTS, ...options };
    this.lost = false;
    gl.canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.lost = true;
    });

    this.programs = {
      bright: this.program(BRIGHT),
      blur: this.program(BLUR),
      composite: this.program(COMPOSITE),
    };

    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    this.sceneTex = this.texture();
    this.size = { w: 0, h: 0 };
  }

  program(fragmentSource) {
    const { gl } = this;
    const compile = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
      return shader;
    };
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
    gl.bindAttribLocation(program, 0, 'aPos');
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    const uniforms = {};
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
      const name = gl.getActiveUniform(program, i).name.replace('[0]', '');
      uniforms[name] = gl.getUniformLocation(program, name);
    }
    return { program, uniforms };
  }

  texture() {
    const { gl } = this;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  }

  /** Textura + framebuffer de w×h para un paso intermedio. */
  target(w, h) {
    const { gl } = this;
    const tex = this.texture();
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { tex, fbo, w, h };
  }

  resize(w, h) {
    if (this.size.w === w && this.size.h === h) return;
    this.size = { w, h };
    const hw = Math.max(1, w >> 1);
    const hh = Math.max(1, h >> 1);
    const qw = Math.max(1, w >> 2);
    const qh = Math.max(1, h >> 2);
    this.half = [this.target(hw, hh), this.target(hw, hh)];
    this.quarter = [this.target(qw, qh), this.target(qw, qh)];
  }

  pass({ program, uniforms }, target, setUniforms) {
    const { gl } = this;
    gl.useProgram(program);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.fbo : null);
    gl.viewport(0, 0, target ? target.w : this.size.w, target ? target.h : this.size.h);
    setUniforms(uniforms);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  bind(unit, tex, location) {
    const { gl } = this;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(location, unit);
  }

  /** Aplica el post-procesado a `source` (canvas 2D) y lo dibuja en el canvas WebGL. */
  render(source, { waves = [] } = {}) {
    if (this.lost) return;
    const { gl, options: o } = this;
    const w = gl.canvas.width;
    const h = gl.canvas.height;
    this.resize(w, h);
    gl.bindVertexArray(this.vao);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.sceneTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);

    const [h0, h1] = this.half;
    const [q0, q1] = this.quarter;
    const { bright, blur, composite } = this.programs;

    this.pass(bright, h0, (u) => {
      this.bind(0, this.sceneTex, u.uTex);
      gl.uniform1f(u.uThreshold, o.threshold);
      gl.uniform1f(u.uKnee, o.knee);
    });
    const blurPass = (src, dst, dx, dy) =>
      this.pass(blur, dst, (u) => {
        this.bind(0, src.tex, u.uTex);
        gl.uniform2f(u.uStep, dx / src.w, dy / src.h);
      });
    blurPass(h0, h1, 1, 0);
    blurPass(h1, h0, 0, 1);
    blurPass(h0, q0, 1, 0); // reduce a ¼ mientras difumina
    blurPass(q0, q1, 0, 1);
    blurPass(q1, q0, 2, 0);
    blurPass(q0, q1, 0, 2);

    const packed = packWaves(waves);
    this.pass(composite, null, (u) => {
      this.bind(0, this.sceneTex, u.uScene);
      this.bind(1, h0.tex, u.uBloomNear);
      this.bind(2, q1.tex, u.uBloomFar);
      gl.uniform1f(u.uAspect, w / h);
      gl.uniform1f(u.uBloomNearStrength, o.bloomNear);
      gl.uniform1f(u.uBloomFarStrength, o.bloomFar);
      gl.uniform4fv(u.uWaves, packed.data);
      gl.uniform1i(u.uWaveCount, packed.count);
    });
  }
}
