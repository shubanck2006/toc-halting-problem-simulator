/**
 * ReactBits Vanilla JavaScript Port
 * Official implementation adapted from DavidHDev/react-bits
 * TOC Halting Problem Simulator
 *
 * Implements:
 * 1. Waves background engine (WebGL2 instanced shader with 2D Canvas fallback)
 * 2. StarBorder button perimeter tracer (2D canvas glow with mutation guard)
 * 3. Magnet button physics (Spring solver via CSS translate)
 * 4. GlareHover button effect (Angled specular streak + 1px rim glint)
 * 5. ClickSpark interactive burst (Viewport fixed canvas particle layer)
 */

(function () {
  'use strict';

  /* ==========================================================================
     Shared Utilities
     ========================================================================== */

  var clamp = function (val, min, max) {
    return Math.min(max, Math.max(min, val));
  };

  var smootherstep = function (val) {
    var t = clamp(val, 0, 1);
    return t * t * t * (t * (t * 6 - 15) + 10);
  };

  var smoothstep = function (edge0, edge1, val) {
    var t = clamp((val - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  };

  var prefersReducedMotion = function () {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  };

  var isElementDisabled = function (el) {
    if (!el) return true;
    if (el.disabled) return true;
    if (el.classList && el.classList.contains('is-disabled')) return true;
    if (el.getAttribute('aria-disabled') === 'true') return true;
    return false;
  };

  var parseRgb = function (colorStr) {
    var probe = document.createElement('canvas').getContext('2d');
    if (!probe) return [1, 1, 1];
    probe.fillStyle = '#ffffff';
    probe.fillStyle = colorStr || '#ffffff';
    var formatted = String(probe.fillStyle);
    if (formatted.charAt(0) === '#') {
      var hex = parseInt(formatted.slice(1, 7), 16);
      return [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];
    }
    var m = formatted.match(/[\d.]+/g);
    if (m && m.length >= 3) {
      return [parseFloat(m[0]) / 255, parseFloat(m[1]) / 255, parseFloat(m[2]) / 255];
    }
    return [1, 1, 1];
  };

  /* ==========================================================================
     1. Waves Background Engine ([data-rb-waves])
     ========================================================================== */

  var WAVES_SHAPE = {
    lineStyle: 'solid',
    spacing: 10,
    lineWidth: 0.85,
    rotation: 0,
    amplitude: 36,
    scale: 1.2,
    twist: 0.9,
    speed: 0.7,
    variation: 0,
    mouseRadius: 175,
    mouseStrength: 1,
    bounce: 0.5,
    returnDuration: 1.4,
    fade: 0.42,
    opacity: 0.65,
    clickRipple: true,
    intro: true,
    lineColor: '#3F3F3F',
    accentColor: '#6BA0D8'
  };

  var WAVES_PRESETS = {
    classic: Object.assign({}, WAVES_SHAPE),
    silk: Object.assign({}, WAVES_SHAPE, {
      spacing: 6,
      lineWidth: 0.75,
      amplitude: 40,
      scale: 1.3,
      twist: 0.8,
      speed: 0.6,
      returnDuration: 2
    }),
    tide: Object.assign({}, WAVES_SHAPE, {
      rotation: 90,
      spacing: 12,
      amplitude: 28,
      scale: 1.4,
      twist: 0.9,
      speed: 0.8
    }),
    rain: Object.assign({}, WAVES_SHAPE, {
      lineStyle: 'dashed',
      spacing: 12,
      rotation: 8,
      amplitude: 28,
      speed: 1.6
    }),
    dune: Object.assign({}, WAVES_SHAPE, {
      amplitude: 40,
      scale: 1.1,
      twist: 1.5,
      speed: 1.6,
      bounce: 0.65
    })
  };

  var WAVES_CELL = 12;
  var WAVES_STEP = 4;
  var WAVES_INTRO_SECONDS = 2.2;
  var WAVES_RIPPLE_SPEED = 640;
  var WAVES_RIPPLE_WIDTH = 64;
  var WAVES_RIPPLE_IMPULSE = (WAVES_RIPPLE_WIDTH * Math.sqrt(Math.PI / 2)) / WAVES_RIPPLE_SPEED;
  var WAVES_MAX_VERTICES = 1600000;

  var WAVES_VERTEX_SHADER = `#version 300 es
precision highp float;
precision highp int;
uniform vec2 uView;
uniform float uRatio;
uniform vec2 uAxis;
uniform float uSpacing;
uniform float uStep;
uniform vec2 uStart;
uniform float uAmplitude;
uniform vec2 uFrequency;
uniform vec2 uDrift;
uniform float uTwist;
uniform uint uSeed;
uniform sampler2D uField;
uniform ivec2 uFieldSize;
uniform float uCell;
uniform float uLimit;
uniform float uReach;
uniform float uReveal;
uniform float uBand;
out float vAcross;
out float vAlong;
out float vEnergy;
out float vShow;
out float vPhase;

const vec2 GRADIENTS[12] = vec2[12](
  vec2(1.0, 1.0), vec2(-1.0, 1.0), vec2(1.0, -1.0), vec2(-1.0, -1.0),
  vec2(1.0, 0.0), vec2(-1.0, 0.0), vec2(1.0, 0.0), vec2(-1.0, 0.0),
  vec2(0.0, 1.0), vec2(0.0, -1.0), vec2(0.0, 1.0), vec2(0.0, -1.0)
);

vec2 gradient(vec2 cell) {
  uvec2 q = uvec2(ivec2(cell) + 65536) + uvec2(uSeed * 7919u, uSeed * 104729u);
  q = 1103515245u * ((q >> 1u) ^ q.yx);
  uint n = 1103515245u * (q.x ^ (q.y >> 3u));
  return GRADIENTS[(n >> 16u) % 12u];
}

float ease(float t) {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

float perlin(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  float n00 = dot(gradient(i), f);
  float n10 = dot(gradient(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
  float n01 = dot(gradient(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
  float n11 = dot(gradient(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));
  vec2 u = vec2(ease(f.x), ease(f.y));
  return mix(mix(n00, n10, u.x), mix(n01, n11, u.x), u.y);
}

vec2 node(ivec2 cell) {
  return texelFetch(uField, clamp(cell, ivec2(0), uFieldSize - 1), 0).xy;
}

void weights(float f, out vec4 w, out vec4 d) {
  float g = 1.0 - f;
  float f2 = f * f;
  float f3 = f2 * f;
  w = vec4(g * g * g, 3.0 * f3 - 6.0 * f2 + 4.0, -3.0 * f3 + 3.0 * f2 + 3.0 * f + 1.0, f3) / 6.0;
  d = vec4(-g * g, 3.0 * f2 - 4.0 * f, -3.0 * f2 + 2.0 * f + 1.0, f2) * 0.5;
}

vec2 field(vec2 point, out mat2 slope) {
  vec2 t = point / uCell;
  vec2 base = floor(t);
  vec2 f = t - base;
  vec4 wx;
  vec4 dx;
  vec4 wy;
  vec4 dy;
  weights(f.x, wx, dx);
  weights(f.y, wy, dy);
  ivec2 origin = ivec2(base) - 1;
  vec2 value = vec2(0.0);
  vec2 alongX = vec2(0.0);
  vec2 alongY = vec2(0.0);
  for (int j = 0; j < 4; j++) {
    vec2 row = vec2(0.0);
    vec2 rowSlope = vec2(0.0);
    for (int i = 0; i < 4; i++) {
      vec2 tap = node(origin + ivec2(i, j));
      row += tap * wx[i];
      rowSlope += tap * dx[i];
    }
    value += row * wy[j];
    alongX += rowSlope * wy[j];
    alongY += row * dy[j];
  }
  float size = length(value);
  float scale = size > 0.0001 ? uLimit * tanh(size / uLimit) / size : 1.0;
  slope = mat2(alongX, alongY) * (scale / uCell);
  return value * scale;
}

vec2 wave(vec2 rest) {
  float turn = perlin(rest * uFrequency + uDrift) * 12.0 * uTwist;
  vec2 local = rest + vec2(cos(turn), sin(turn) * 0.5) * uAmplitude;
  return uView * 0.5 + vec2(local.x * uAxis.x - local.y * uAxis.y, local.x * uAxis.y + local.y * uAxis.x);
}

void main() {
  int index = gl_VertexID >> 1;
  float side = float(gl_VertexID & 1) * 2.0 - 1.0;
  float u = uStart.x + float(gl_InstanceID) * uSpacing;
  float v = uStart.y + float(index) * uStep;
  vec2 flowing = wave(vec2(u, v));
  vec2 bend = wave(vec2(u, v + uStep)) - wave(vec2(u, v - uStep));
  mat2 slope;
  vec2 shift = field(flowing, slope);
  vec2 point = flowing + shift;
  float energy = length(shift);
  vec2 tangent = bend + slope * bend;
  float span = max(length(tangent), 0.0001);
  vec2 normal = vec2(-tangent.y, tangent.x) / span;
  vec2 corner = point + normal * side * uReach / uRatio;
  vAcross = side * uReach;
  vAlong = v;
  vEnergy = energy;
  vShow = clamp((uReveal - abs(u)) / uBand, 0.0, 1.0);
  uint line = uint(gl_InstanceID) * 747796405u + uSeed * 2891336453u + 1u;
  line = ((line >> ((line >> 28u) + 4u)) ^ line) * 277803737u;
  vPhase = float((line >> 22u) ^ line) / 4294967295.0;
  vec2 clip = corner / uView * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}`;

  var WAVES_FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform vec2 uView;
uniform float uRatio;
uniform float uHalf;
uniform float uThin;
uniform int uStyle;
uniform float uPeriod;
uniform float uFlow;
uniform vec3 uColor;
uniform vec3 uAccent;
uniform float uBase;
uniform float uHeat;
uniform float uFade;
uniform float uOpacity;
in float vAcross;
in float vAlong;
in float vEnergy;
in float vShow;
in float vPhase;
out vec4 outColor;

float smootherstep(float edge, float x) {
  float t = clamp(x / max(edge, 0.0001), 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

void main() {
  float coverage = clamp(uHalf + 0.5 - abs(vAcross), 0.0, 1.0) * uThin;
  if (uStyle == 1) {
    float phase = (vAlong + uFlow) / uPeriod + vPhase;
    float blur = max(fwidth(phase), 0.0001);
    coverage *= clamp((0.25 - abs(fract(phase) - 0.5)) / blur + 0.5, 0.0, 1.0);
  }
  float heat = smoothstep(0.0, uHeat, vEnergy);
  vec2 uv = gl_FragCoord.xy / (uView * uRatio);
  float edge = uFade * 0.5;
  float mask = smootherstep(edge, uv.x) * smootherstep(edge, 1.0 - uv.x) * smootherstep(edge, uv.y) * smootherstep(edge, 1.0 - uv.y);
  float alpha = coverage * mix(uBase, 1.0, heat) * mask * vShow * uOpacity;
  outColor = vec4(mix(uColor, uAccent, heat) * alpha, alpha);
}`;

  var compileShader = function (gl, type, source) {
    var shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    gl.deleteShader(shader);
    return null;
  };

  var linkProgram = function (gl) {
    var vertex = compileShader(gl, gl.VERTEX_SHADER, WAVES_VERTEX_SHADER);
    var fragment = compileShader(gl, gl.FRAGMENT_SHADER, WAVES_FRAGMENT_SHADER);
    var program = gl.createProgram();
    if (!vertex || !fragment || !program) return null;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return null;
    }
    var uniforms = {};
    var count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < count; i++) {
      var info = gl.getActiveUniform(program, i);
      if (info) uniforms[info.name] = gl.getUniformLocation(program, info.name);
    }
    return { program: program, uniforms: uniforms };
  };

  var wavesInitialized = new WeakSet();

  function initWaves(container) {
    var targets = container
      ? [container]
      : Array.from(document.querySelectorAll('[data-rb-waves]'));

    targets.forEach(function (el) {
      if (wavesInitialized.has(el)) return;
      wavesInitialized.add(el);

      var presetName = el.dataset.preset || 'classic';
      var presetBase = WAVES_PRESETS[presetName] || WAVES_PRESETS.classic;

      var settings = Object.assign({}, presetBase, {
        lineColor: el.dataset.lineColor || presetBase.lineColor,
        accentColor: el.dataset.accentColor || presetBase.accentColor,
        lineStyle: el.dataset.lineStyle === 'dashed' ? 1 : (presetBase.lineStyle === 'dashed' ? 1 : 0),
        spacing: el.dataset.spacing ? parseFloat(el.dataset.spacing) : presetBase.spacing,
        lineWidth: el.dataset.lineWidth ? parseFloat(el.dataset.lineWidth) : presetBase.lineWidth,
        rotation: el.dataset.rotation !== undefined ? parseFloat(el.dataset.rotation) : presetBase.rotation,
        amplitude: el.dataset.amplitude ? parseFloat(el.dataset.amplitude) : presetBase.amplitude,
        scale: el.dataset.scale ? parseFloat(el.dataset.scale) : presetBase.scale,
        twist: el.dataset.twist ? parseFloat(el.dataset.twist) : presetBase.twist,
        speed: el.dataset.speed ? parseFloat(el.dataset.speed) : presetBase.speed,
        fade: el.dataset.fade ? parseFloat(el.dataset.fade) : presetBase.fade,
        opacity: el.dataset.opacity ? parseFloat(el.dataset.opacity) : presetBase.opacity,
        mouseRadius: el.dataset.mouseRadius ? parseFloat(el.dataset.mouseRadius) : presetBase.mouseRadius,
        mouseStrength: presetBase.mouseStrength || 1,
        bounce: el.dataset.bounce ? parseFloat(el.dataset.bounce) : presetBase.bounce,
        returnDuration: el.dataset.returnDuration ? parseFloat(el.dataset.returnDuration) : presetBase.returnDuration,
        clickRipple: el.dataset.clickRipple !== 'false',
        intro: true,
        variation: el.dataset.variation ? parseInt(el.dataset.variation, 10) : 0
      });

      var canvas = el.querySelector('canvas.waves__canvas');
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.className = 'waves__canvas';
        canvas.setAttribute('aria-hidden', 'true');
        el.appendChild(canvas);
      }

      var reduce = prefersReducedMotion();
      var gl = null;
      var webglFailed = false;

      try {
        gl = canvas.getContext('webgl2', {
          alpha: true,
          premultipliedAlpha: true,
          antialias: false,
          depth: false,
          stencil: false
        });
      } catch (e) {
        webglFailed = true;
      }

      if (gl) {
        setupWebGL2Waves(el, canvas, gl, settings, reduce);
      } else {
        setup2DFallbackWaves(el, canvas, settings, reduce);
      }
    });
  }

  function setupWebGL2Waves(container, canvas, gl, settings, reduce) {
    var programResult = null;
    var texture = null;
    var vao = null;

    try {
      programResult = linkProgram(gl);
      if (!programResult) throw new Error('Program link failed');

      vao = gl.createVertexArray();
      texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

      // Verify RG32F support
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, 2, 2, 0, gl.RG, gl.FLOAT, new Float32Array(8));
      if (gl.getError() !== gl.NO_ERROR) throw new Error('RG32F texture not supported');
    } catch (err) {
      if (vao) gl.deleteVertexArray(vao);
      if (texture) gl.deleteTexture(texture);
      if (programResult) gl.deleteProgram(programResult.program);
      setup2DFallbackWaves(container, canvas, settings, reduce);
      return;
    }

    var u = programResult.uniforms;
    var baseRgb = parseRgb(settings.lineColor);
    var accentRgb = parseRgb(settings.accentColor);

    var view = { width: 1, height: 1, ratio: 1 };
    var grid = {
      cols: 0,
      rows: 0,
      shift: new Float32Array(0),
      speed: new Float32Array(0),
      top: 0,
      bottom: -1,
      left: 0,
      right: -1
    };

    var pointer = { x: 0, y: 0, sx: 0, sy: 0, vx: 0, vy: 0, inside: false };
    var ripples = [];
    var state = { flow: 0, intro: settings.intro && !reduce ? 0 : 1 };
    var raf = 0;
    var last = 0;
    var visible = true;

    var limitOf = function (s) {
      return Math.max(12, s.mouseRadius * 0.5);
    };

    var rebuild = function () {
      grid.cols = Math.ceil(view.width / WAVES_CELL) + 2;
      grid.rows = Math.ceil(view.height / WAVES_CELL) + 2;
      grid.shift = new Float32Array(grid.cols * grid.rows * 2);
      grid.speed = new Float32Array(grid.cols * grid.rows * 2);
      grid.top = 0;
      grid.bottom = -1;
      grid.left = 0;
      grid.right = -1;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, grid.cols, grid.rows, 0, gl.RG, gl.FLOAT, grid.shift);
    };

    var include = function (x0, y0, x1, y1) {
      var c0 = clamp(Math.floor(x0 / WAVES_CELL), 0, grid.cols - 1);
      var c1 = clamp(Math.ceil(x1 / WAVES_CELL), 0, grid.cols - 1);
      var r0 = clamp(Math.floor(y0 / WAVES_CELL), 0, grid.rows - 1);
      var r1 = clamp(Math.ceil(y1 / WAVES_CELL), 0, grid.rows - 1);
      var empty = grid.bottom < grid.top;
      grid.top = empty ? r0 : Math.min(grid.top, r0);
      grid.bottom = empty ? r1 : Math.max(grid.bottom, r1);
      grid.left = empty ? c0 : Math.min(grid.left, c0);
      grid.right = empty ? c1 : Math.max(grid.right, c1);
    };

    var simulate = function (dt) {
      var s = settings;
      var follow = 1 - Math.exp(-dt / 0.045);
      var nx = pointer.sx + (pointer.x - pointer.sx) * follow;
      var ny = pointer.sy + (pointer.y - pointer.sy) * follow;
      var blend = 1 - Math.exp(-dt / 0.06);
      pointer.vx += ((nx - pointer.sx) / dt - pointer.vx) * blend;
      pointer.vy += ((ny - pointer.sy) / dt - pointer.vy) * blend;
      pointer.sx = nx;
      pointer.sy = ny;

      var zeta = 1 - 0.85 * s.bounce;
      var omega = 4 / (zeta * s.returnDuration);
      var radius = s.mouseRadius;
      var speedNow = Math.hypot(pointer.vx, pointer.vy);
      var drive = pointer.inside && !reduce ? 26000 * Math.tanh(speedNow / 1400) * s.mouseStrength : 0;
      if (drive > 1) include(pointer.sx - radius, pointer.sy - radius, pointer.sx + radius, pointer.sy + radius);

      var live = [];
      for (var i = ripples.length - 1; i >= 0; i--) {
        var rip = ripples[i];
        rip.age += dt;
        var front = rip.age * WAVES_RIPPLE_SPEED;
        var life = 1 - front / rip.range;
        if (life <= 0) {
          ripples.splice(i, 1);
          continue;
        }
        var reach = front + WAVES_RIPPLE_WIDTH * 3;
        include(rip.x - reach, rip.y - reach, rip.x + reach, rip.y + reach);
        live.push({
          x: rip.x,
          y: rip.y,
          front: front,
          power: (150 * omega * life * Math.sqrt(life)) / WAVES_RIPPLE_IMPULSE
        });
      }

      if (grid.bottom < grid.top) return false;

      var stiffness = omega * omega;
      var damping = 2 * zeta * omega;
      var steps = Math.min(16, Math.max(1, Math.ceil(dt / Math.min(1 / 120, 0.6 / omega))));
      var h = dt / steps;
      var dirX = speedNow > 0.001 ? pointer.vx / speedNow : 0;
      var dirY = speedNow > 0.001 ? pointer.vy / speedNow : 0;
      var cols = grid.cols;
      var shift = grid.shift;
      var velocity = grid.speed;
      var left = grid.left;
      var right = grid.right;
      var peak = 0;

      for (var row = grid.top; row <= grid.bottom; row++) {
        var y = row * WAVES_CELL;
        for (var col = left; col <= right; col++) {
          var x = col * WAVES_CELL;
          var index = (row * cols + col) * 2;
          var ax = 0;
          var ay = 0;
          if (drive > 1) {
            var dist = Math.hypot(x - pointer.sx, y - pointer.sy);
            if (dist < radius) {
              var w = smootherstep(1 - dist / radius) * drive;
              ax += dirX * w;
              ay += dirY * w;
            }
          }
          for (var rIdx = 0; rIdx < live.length; rIdx++) {
            var ripItem = live[rIdx];
            var ex = x - ripItem.x;
            var ey = y - ripItem.y;
            var distance = Math.hypot(ex, ey);
            var offset = (distance - ripItem.front) / WAVES_RIPPLE_WIDTH;
            if (distance > 0.001 && Math.abs(offset) < 3) {
              var push = ripItem.power * Math.exp(-offset * offset * 2) * smootherstep(distance / 56);
              ax += (ex / distance) * push;
              ay += (ey / distance) * push;
            }
          }
          var px = shift[index];
          var py = shift[index + 1];
          var vx = velocity[index];
          var vy = velocity[index + 1];
          for (var k = 0; k < steps; k++) {
            vx += (ax - stiffness * px - damping * vx) * h;
            vy += (ay - stiffness * py - damping * vy) * h;
            px += vx * h;
            py += vy * h;
          }
          shift[index] = px;
          shift[index + 1] = py;
          velocity[index] = vx;
          velocity[index + 1] = vy;
          peak = Math.max(peak, Math.abs(px) + Math.abs(py) + (Math.abs(vx) + Math.abs(vy)) * 0.05);
        }
      }

      var top = grid.top;
      var height = grid.bottom - grid.top + 1;
      if (peak < 0.02 && drive <= 1 && !live.length) {
        for (var clearRow = grid.top; clearRow <= grid.bottom; clearRow++) {
          shift.fill(0, (clearRow * cols + left) * 2, (clearRow * cols + right + 1) * 2);
          velocity.fill(0, (clearRow * cols + left) * 2, (clearRow * cols + right + 1) * 2);
        }
        grid.top = 0;
        grid.bottom = -1;
      }
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        0,
        top,
        cols,
        height,
        gl.RG,
        gl.FLOAT,
        shift.subarray(top * cols * 2, (top + height) * cols * 2)
      );
      return grid.bottom >= grid.top;
    };

    var render = function () {
      var s = settings;
      var angle = (s.rotation * Math.PI) / 180;
      var cos = Math.cos(angle);
      var sin = Math.sin(angle);
      var limit = limitOf(s);
      var margin = s.amplitude * 1.1 + limit + s.spacing * 2 + 8;
      var reachU = (view.width * Math.abs(cos) + view.height * Math.abs(sin)) / 2 + margin;
      var reachV = (view.width * Math.abs(sin) + view.height * Math.abs(cos)) / 2 + margin;
      var half = Math.ceil(reachU / s.spacing);
      var lines = half * 2 + 1;
      var step = WAVES_STEP;
      var samples = Math.ceil((reachV * 2) / step) + 1;
      if (lines * samples * 2 > WAVES_MAX_VERTICES) {
        samples = Math.max(16, Math.floor(WAVES_MAX_VERTICES / (lines * 2)));
        step = (reachV * 2) / (samples - 1);
      }
      var width = s.lineWidth * view.ratio;
      var halfWidth = Math.max(0.5, width / 2);
      var reach = halfWidth + 1;
      var progress = state.intro;
      var reveal = s.intro && !reduce ? (1 - Math.pow(1 - clamp(progress / 0.7, 0, 1), 3)) * reachU * 1.3 : 1e6;
      var swell = s.intro && !reduce ? smootherstep((progress - 0.1) / 0.9) : 1;
      var flowTime = state.flow + s.variation * 37.1;

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(programResult.program);
      gl.bindVertexArray(vao);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(u.uField, 0);
      gl.uniform2f(u.uView, view.width, view.height);
      gl.uniform1f(u.uRatio, view.ratio);
      gl.uniform2f(u.uAxis, cos, sin);
      gl.uniform1f(u.uSpacing, s.spacing);
      gl.uniform1f(u.uStep, step);
      gl.uniform2f(u.uStart, -half * s.spacing, -reachV);
      gl.uniform1f(u.uAmplitude, s.amplitude * swell);
      gl.uniform2f(u.uFrequency, 0.002 / s.scale, 0.0015 / s.scale);
      gl.uniform2f(u.uDrift, flowTime * 0.025, flowTime * 0.0075);
      gl.uniform1f(u.uTwist, s.twist);
      gl.uniform1ui(u.uSeed, s.variation);
      gl.uniform2i(u.uFieldSize, grid.cols, grid.rows);
      gl.uniform1f(u.uCell, WAVES_CELL);
      gl.uniform1f(u.uLimit, limit);
      gl.uniform1f(u.uReach, reach);
      gl.uniform1f(u.uReveal, reveal);
      gl.uniform1f(u.uBand, Math.max(1, reachU * 0.3));
      gl.uniform1f(u.uHalf, halfWidth);
      gl.uniform1f(u.uThin, Math.min(1, width));
      gl.uniform1i(u.uStyle, s.lineStyle);
      gl.uniform1f(u.uPeriod, s.spacing * 2.6);
      gl.uniform1f(u.uFlow, (state.flow * 16) % (s.spacing * 2.6));
      gl.uniform3fv(u.uColor, baseRgb);
      gl.uniform3fv(u.uAccent, accentRgb);
      gl.uniform1f(u.uBase, 0.62);
      gl.uniform1f(u.uHeat, limit * 0.55);
      gl.uniform1f(u.uFade, s.fade);
      gl.uniform1f(u.uOpacity, s.opacity);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, samples * 2, lines);
    };

    var frame = function (now) {
      raf = 0;
      if (!visible || document.hidden) return;
      var dt = last ? clamp((now - last) / 1000, 0.0005, 0.05) : 1 / 60;
      last = now;

      if (!reduce) state.flow += dt * settings.speed;
      if (!settings.intro || reduce) state.intro = 1;
      else if (state.intro < 1) state.intro = Math.min(1, state.intro + dt / WAVES_INTRO_SECONDS);

      var awake = simulate(dt);
      render();

      var engaged = pointer.inside && Math.hypot(pointer.vx, pointer.vy) > 1;
      if (!reduce || awake || engaged || ripples.length || state.intro < 1) {
        raf = requestAnimationFrame(frame);
      } else {
        last = 0;
      }
    };

    var wake = function () {
      if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame);
    };

    var resize = function () {
      var width = Math.max(1, container.clientWidth);
      var height = Math.max(1, container.clientHeight);
      var ratio = Math.min(window.devicePixelRatio || 1, 2);
      view.width = width;
      view.height = height;
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      view.ratio = canvas.width / width;
      rebuild();
      render();
      wake();
    };

    var place = function (event, snap) {
      var rect = container.getBoundingClientRect();
      var x = event.clientX - rect.left;
      var y = event.clientY - rect.top;
      var inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
      if (snap || (inside && !pointer.inside)) {
        pointer.sx = x;
        pointer.sy = y;
        pointer.vx = 0;
        pointer.vy = 0;
      }
      pointer.inside = inside;
      pointer.x = x;
      pointer.y = y;
      return { x: x, y: y, rect: rect, inside: inside };
    };

    var onPointerMove = function (event) {
      place(event, false);
      wake();
    };

    var onPointerDown = function (event) {
      var p = place(event, event.pointerType !== 'mouse');
      if (p.inside && settings.clickRipple && !reduce) {
        ripples.push({
          x: p.x,
          y: p.y,
          age: 0,
          range: Math.max(360, Math.hypot(p.rect.width, p.rect.height) * 0.55)
        });
        if (ripples.length > 6) ripples.shift();
      }
      wake();
    };

    var onPointerUp = function (event) {
      if (event.pointerType !== 'mouse') pointer.inside = false;
    };

    var onPointerLeave = function () {
      pointer.inside = false;
      wake();
    };

    var onVisibility = function () {
      last = 0;
      wake();
    };

    var ro = new ResizeObserver(resize);
    ro.observe(container);

    var io = new IntersectionObserver(function (entries) {
      visible = entries.some(function (entry) { return entry.isIntersecting; });
      if (visible) {
        last = 0;
        wake();
      }
    });
    io.observe(container);

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', onPointerUp, { passive: true });
    document.documentElement.addEventListener('pointerleave', onPointerLeave);
    document.addEventListener('visibilitychange', onVisibility);

    resize();
  }

  /* 2D Canvas Fallback for systems without WebGL2 / float texture support */
  function setup2DFallbackWaves(container, canvas, settings, reduce) {
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var width = 1;
    var height = 1;
    var dpr = 1;
    var raf = 0;
    var time = 0;
    var pointer = { x: 0, y: 0, inside: false };
    var ripples = [];

    var resize = function () {
      width = Math.max(1, container.clientWidth);
      height = Math.max(1, container.clientHeight);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      render();
    };

    var render = function () {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var lines = Math.ceil(height / settings.spacing) + 6;
      ctx.lineWidth = settings.lineWidth;
      ctx.strokeStyle = settings.lineColor;
      ctx.globalAlpha = settings.opacity;

      for (var i = 0; i < lines; i++) {
        var baseY = (i - 2) * settings.spacing;
        ctx.beginPath();
        if (settings.lineStyle === 1) {
          ctx.setLineDash([settings.spacing * 1.2, settings.spacing * 0.8]);
        } else {
          ctx.setLineDash([]);
        }

        for (var x = 0; x <= width + 24; x += 16) {
          var waveOffset = Math.sin(x * 0.008 / settings.scale + time * settings.speed + i * 0.3) * settings.amplitude * 0.4;
          var y = baseY + waveOffset;

          if (pointer.inside) {
            var dist = Math.hypot(x - pointer.x, y - pointer.y);
            if (dist < settings.mouseRadius) {
              var push = (1 - dist / settings.mouseRadius) * 18;
              y += push;
            }
          }

          for (var rIdx = 0; rIdx < ripples.length; rIdx++) {
            var rip = ripples[rIdx];
            var rDist = Math.hypot(x - rip.x, y - rip.y);
            var rDiff = Math.abs(rDist - rip.radius);
            if (rDiff < 48) {
              y += (1 - rDiff / 48) * (1 - rip.radius / rip.maxRadius) * 20;
            }
          }

          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    };

    var frame = function () {
      raf = 0;
      time += 0.02;

      for (var i = ripples.length - 1; i >= 0; i--) {
        ripples[i].radius += 6;
        if (ripples[i].radius >= ripples[i].maxRadius) {
          ripples.splice(i, 1);
        }
      }

      render();
      if (!reduce || ripples.length > 0) {
        raf = requestAnimationFrame(frame);
      }
    };

    var wake = function () {
      if (!raf) raf = requestAnimationFrame(frame);
    };

    window.addEventListener('pointermove', function (e) {
      var rect = container.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.inside = pointer.x >= 0 && pointer.y >= 0 && pointer.x <= rect.width && pointer.y <= rect.height;
      if (!reduce) wake();
    }, { passive: true });

    window.addEventListener('pointerdown', function (e) {
      var rect = container.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      if (x >= 0 && y >= 0 && x <= rect.width && y <= rect.height && settings.clickRipple && !reduce) {
        ripples.push({ x: x, y: y, radius: 0, maxRadius: Math.max(300, Math.hypot(rect.width, rect.height) * 0.5) });
        wake();
      }
    }, { passive: true });

    var ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();
    wake();
  }

  /* ==========================================================================
     2. StarBorder Button Effect (.btn-primary, [data-rb-star-border])
     ========================================================================== */

  var STAR_BLEED = 48;
  var STAR_LAP = 0.9;
  var STAR_TAU = Math.PI * 2;
  var STAR_WHITE = [255, 255, 255];

  var starBorderOutline = function (width, height, radius) {
    var r = Math.max(0, Math.min(radius, width / 2, height / 2));
    var arc = (Math.PI * r) / 2;
    var across = Math.max(0, width - 2 * r);
    var down = Math.max(0, height - 2 * r);
    var segments = [
      { length: across, x: r, y: 0, dx: 1, dy: 0, angle: null },
      { length: arc, x: width - r, y: r, dx: 0, dy: 0, angle: -Math.PI / 2 },
      { length: down, x: width, y: r, dx: 0, dy: 1, angle: null },
      { length: arc, x: width - r, y: height - r, dx: 0, dy: 0, angle: 0 },
      { length: across, x: width - r, y: height, dx: -1, dy: 0, angle: null },
      { length: arc, x: r, y: height - r, dx: 0, dy: 0, angle: Math.PI / 2 },
      { length: down, x: 0, y: height - r, dx: 0, dy: -1, angle: null },
      { length: arc, x: r, y: r, dx: 0, dy: 0, angle: Math.PI }
    ];
    return {
      r: r,
      segments: segments,
      total: Math.max(1, segments.reduce(function (sum, seg) { return sum + seg.length; }, 0))
    };
  };

  var starBorderPointAt = function (shape, distance, point) {
    var s = ((distance % shape.total) + shape.total) % shape.total;
    for (var i = 0; i < shape.segments.length; i++) {
      var seg = shape.segments[i];
      if (seg.length > 0 && s <= seg.length) {
        if (seg.angle === null) {
          point.x = seg.x + seg.dx * s;
          point.y = seg.y + seg.dy * s;
          point.nx = seg.dy;
          point.ny = -seg.dx;
        } else {
          var angle = seg.angle + s / shape.r;
          point.nx = Math.cos(angle);
          point.ny = Math.sin(angle);
          point.x = seg.x + point.nx * shape.r;
          point.y = seg.y + point.ny * shape.r;
        }
        return point;
      }
      s -= seg.length;
    }
    return point;
  };

  var starBorderProject = function (shape, px, py) {
    var best = Infinity;
    var found = 0;
    var offset = 0;
    shape.segments.forEach(function (seg) {
      if (seg.length > 0) {
        var s = 0;
        var x = 0;
        var y = 0;
        if (seg.angle === null) {
          s = clamp((px - seg.x) * seg.dx + (py - seg.y) * seg.dy, 0, seg.length);
          x = seg.x + seg.dx * s;
          y = seg.y + seg.dy * s;
        } else {
          var angle = (((Math.atan2(py - seg.y, px - seg.x) - seg.angle) % STAR_TAU) + STAR_TAU) % STAR_TAU;
          if (angle > Math.PI / 2) angle = angle > Math.PI * 1.25 ? 0 : Math.PI / 2;
          s = angle * shape.r;
          x = seg.x + Math.cos(seg.angle + angle) * shape.r;
          y = seg.y + Math.sin(seg.angle + angle) * shape.r;
        }
        var distSq = (px - x) * (px - x) + (py - y) * (py - y);
        if (distSq < best) {
          best = distSq;
          found = offset + s;
        }
      }
      offset += seg.length;
    });
    return found;
  };

  var starBorderEase = function (t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  var starBorderMix = function (a, b, t) {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  };

  var starBorderRgba = function (rgb, alpha) {
    return 'rgba(' + Math.round(rgb[0]) + ', ' + Math.round(rgb[1]) + ', ' + Math.round(rgb[2]) + ', ' + clamp(alpha, 0, 1).toFixed(3) + ')';
  };

  var starBorderInitialized = new WeakSet();

  function initStarBorder(rootElement) {
    var targets = rootElement
      ? [rootElement]
      : Array.from(document.querySelectorAll('.btn-primary, [data-rb-star-border]'));

    targets.forEach(function (btn) {
      if (starBorderInitialized.has(btn)) return;
      starBorderInitialized.add(btn);

      btn.classList.add('rb-star-border');

      var compStyle = window.getComputedStyle(btn);
      var radiusVal = parseFloat(compStyle.borderRadius) || 8;

      var settings = {
        color: btn.dataset.rbColor || '#82B1E1',
        trailColor: btn.dataset.rbTrailColor || '#4A85C5',
        duration: btn.dataset.rbDuration ? parseFloat(btn.dataset.rbDuration) : 4.2,
        thickness: btn.dataset.rbThickness ? parseFloat(btn.dataset.rbThickness) : 1.25,
        radius: radiusVal,
        trailLength: 0.32,
        stars: 2,
        glow: 0.65,
        sparkle: true,
        direction: 1,
        hover: 'lap',
        clickPulse: true
      };

      var canvas = btn.querySelector('.rb-star-border__canvas');
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.className = 'rb-star-border__canvas';
        canvas.setAttribute('aria-hidden', 'true');
        btn.prepend(canvas);
      }

      /* DOM Safety: re-prepend canvas if button innerHTML is wiped */
      var observer = new MutationObserver(function () {
        if (canvas.parentNode !== btn) {
          observer.disconnect();
          btn.prepend(canvas);
          observer.observe(btn, { childList: true });
        }
      });
      observer.observe(btn, { childList: true });

      var ctx = canvas.getContext('2d');
      if (!ctx) return;

      var reduce = prefersReducedMotion();
      var point = { x: 0, y: 0, nx: 0, ny: -1 };
      var state = {
        width: 0,
        height: 0,
        dpr: 1,
        phase: 0,
        velocity: 0,
        motion: 0,
        lap: -1,
        time: 0,
        reveal: 1,
        boost: 0,
        flash: 0,
        emit: 0,
        hovered: false,
        focused: false,
        visible: true
      };

      var pulses = [];
      var dust = [];
      var headColor = parseRgb(settings.color).map(function (v) { return v * 255; });
      var tailColor = parseRgb(settings.trailColor).map(function (v) { return v * 255; });
      var raf = 0;
      var last = performance.now();

      var measure = function () {
        state.width = btn.offsetWidth;
        state.height = btn.offsetHeight;
        state.dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.max(1, Math.round((state.width + STAR_BLEED * 2) * state.dpr));
        canvas.height = Math.max(1, Math.round((state.height + STAR_BLEED * 2) * state.dpr));
        wake();
      };

      var shapeFor = function () {
        return starBorderOutline(
          Math.max(1, state.width - settings.thickness),
          Math.max(1, state.height - settings.thickness),
          settings.radius - settings.thickness / 2
        );
      };

      var stroke = function (x1, y1, x2, y2, width, strokeStyle) {
        ctx.lineWidth = width;
        ctx.strokeStyle = strokeStyle;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      };

      var drawTrail = function (shape, head, length, sign, intensity, tip) {
        if (length < 0.5 || intensity <= 0) return;
        var steps = clamp(Math.ceil(length / 2), 2, 90);
        starBorderPointAt(shape, head, point);
        var px = point.x;
        var py = point.y;
        for (var i = 1; i <= steps; i++) {
          starBorderPointAt(shape, head - sign * length * (i / steps), point);
          var u = 1 - (i - 0.5) / steps;
          var fade = u * u * intensity;
          var tone = starBorderMix(tailColor, headColor, u);
          tone = starBorderMix(tone, STAR_WHITE, Math.pow(u, 6) * 0.65);
          ctx.lineCap = tip && i === 1 ? 'round' : 'butt';
          stroke(px, py, point.x, point.y, 2 + 6 * settings.glow, starBorderRgba(tone, fade * 0.2 * settings.glow));
          stroke(px, py, point.x, point.y, settings.thickness, starBorderRgba(tone, fade));
          px = point.x;
          py = point.y;
        }
      };

      var drawHead = function (x, y, intensity, twinkle) {
        if (intensity <= 0) return;
        var reach = 12 + 40 * settings.glow;
        var bloom = ctx.createRadialGradient(x, y, 0, x, y, reach);
        var strength = 0.4 * settings.glow * intensity;
        bloom.addColorStop(0, starBorderRgba(headColor, strength));
        bloom.addColorStop(0.2, starBorderRgba(headColor, strength * 0.4));
        bloom.addColorStop(0.5, starBorderRgba(headColor, strength * 0.1));
        bloom.addColorStop(1, starBorderRgba(headColor, 0));
        ctx.fillStyle = bloom;
        ctx.fillRect(x - reach, y - reach, reach * 2, reach * 2);

        if (!settings.sparkle) return;

        var size = 1 + settings.thickness * 0.6;
        var core = ctx.createRadialGradient(x, y, 0, x, y, size * 2.2);
        core.addColorStop(0, starBorderRgba(STAR_WHITE, intensity));
        core.addColorStop(0.4, starBorderRgba(starBorderMix(headColor, STAR_WHITE, 0.5), intensity * 0.9));
        core.addColorStop(1, starBorderRgba(headColor, 0));
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(x, y, size * 2.2, 0, STAR_TAU);
        ctx.fill();

        var spike = (3 + 4 * settings.glow + settings.thickness * 1.5) * twinkle;
        var hGrad = ctx.createLinearGradient(x - spike, y, x + spike, y);
        hGrad.addColorStop(0, starBorderRgba(headColor, 0));
        hGrad.addColorStop(0.5, starBorderRgba(STAR_WHITE, intensity * 0.95));
        hGrad.addColorStop(1, starBorderRgba(headColor, 0));
        stroke(x - spike, y, x + spike, y, 1, hGrad);

        var vGrad = ctx.createLinearGradient(x, y - spike, x, y + spike);
        vGrad.addColorStop(0, starBorderRgba(headColor, 0));
        vGrad.addColorStop(0.5, starBorderRgba(STAR_WHITE, intensity * 0.95));
        vGrad.addColorStop(1, starBorderRgba(headColor, 0));
        stroke(x, y - spike, x, y + spike, 1, vGrad);
      };

      var spawnDust = function (x, y, nx, ny, speed) {
        if (dust.length > 48) return;
        var push = 3 + Math.random() * 10;
        var drift = (Math.random() - 0.5) * 8;
        dust.push({
          x: x + nx * (Math.random() * 3 - 1),
          y: y + ny * (Math.random() * 3 - 1),
          vx: nx * push - ny * drift - speed * -ny * 0.04,
          vy: ny * push + nx * drift - speed * nx * 0.04,
          age: 0,
          life: 0.35 + Math.random() * 0.5,
          size: 0.45 + Math.random() * 0.7,
          seed: Math.random() * STAR_TAU
        });
      };

      var draw = function (shape) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (state.width < 2 || state.height < 2) return;

        var offset = (STAR_BLEED + settings.thickness / 2) * state.dpr;
        ctx.setTransform(state.dpr, 0, 0, state.dpr, offset, offset);
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'butt';

        var total = shape.total;
        var spacing = total / settings.stars;
        var speed = Math.abs(state.motion);
        var sign = state.motion >= 0 ? 1 : -1;
        var span = settings.trailLength * settings.duration;
        var len = Math.min(speed * span, spacing * 0.92, total * 0.6);
        var intensity = state.reveal * (1 + 0.4 * state.boost + 0.6 * state.flash);

        var ring = state.flash * 0.32 + state.boost * state.reveal * 0.12;
        if (ring > 0.005) {
          ctx.lineWidth = settings.thickness + 2 * settings.glow;
          ctx.strokeStyle = starBorderRgba(headColor, ring);
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(0, 0, Math.max(1, state.width - settings.thickness), Math.max(1, state.height - settings.thickness), Math.max(0, shape.r));
          } else {
            ctx.rect(0, 0, Math.max(1, state.width - settings.thickness), Math.max(1, state.height - settings.thickness));
          }
          ctx.stroke();
        }

        var still = clamp(1 - speed / Math.max(1, (total / settings.duration) * 0.6), 0, 1) * Math.min(1, intensity);
        var rest = (10 + 14 * settings.glow + settings.thickness * 2) * still;

        for (var i = 0; i < settings.stars; i++) {
          var head = state.phase + i * spacing;
          drawTrail(shape, head, len, sign, Math.min(1, intensity), true);
          if (still > 0.01) {
            drawTrail(shape, head, rest, 1, still, false);
            drawTrail(shape, head, rest, -1, still, false);
          }
        }

        pulses.forEach(function (pulse) {
          var prog = pulse.age / 0.65;
          var fade = Math.pow(1 - prog, 2);
          var travel = (total / 2) * (1 - Math.pow(1 - Math.min(1, pulse.age / 0.5), 2));
          var tail = Math.min(travel, total * 0.16);
          [1, -1].forEach(function (way) {
            var front = pulse.origin + way * travel;
            drawTrail(shape, front, tail, way, fade, true);
            starBorderPointAt(shape, front, point);
            drawHead(point.x, point.y, fade * 0.8, 0.8);
          });
        });

        for (var sIdx = 0; sIdx < settings.stars; sIdx++) {
          starBorderPointAt(shape, state.phase + sIdx * spacing, point);
          var twinkle = 0.82 + 0.18 * Math.sin(state.time * 6.1 + sIdx * 2.3) * Math.sin(state.time * 2.7 + sIdx);
          drawHead(point.x, point.y, Math.min(1.3, intensity), twinkle);
        }

        dust.forEach(function (mote) {
          var left = 1 - mote.age / mote.life;
          var shimmer = 0.45 + 0.55 * Math.sin(state.time * 20 + mote.seed);
          var alpha = left * shimmer * state.reveal * 0.9;
          if (alpha <= 0.01) return;
          ctx.fillStyle = starBorderRgba(starBorderMix(tailColor, STAR_WHITE, 0.6), alpha);
          ctx.beginPath();
          ctx.arc(mote.x, mote.y, mote.size * (0.6 + 0.4 * left), 0, STAR_TAU);
          ctx.fill();
        });
      };

      var frame = function (now) {
        raf = 0;
        var dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
        last = now;
        state.time += dt;

        var shape = shapeFor();
        var total = shape.total;
        var spacing = total / settings.stars;
        var cruise = reduce ? 0 : (settings.direction * total) / settings.duration;

        state.flash *= Math.exp(-dt / 0.22);
        state.velocity += (cruise - state.velocity) * (1 - Math.exp(-dt / 0.45));

        var extra = 0;
        if (state.lap >= 0) {
          var before = starBorderEase(Math.min(1, state.lap / STAR_LAP));
          state.lap += dt;
          extra = (starBorderEase(Math.min(1, state.lap / STAR_LAP)) - before) * total * settings.direction;
          if (state.lap >= STAR_LAP) state.lap = -1;
        }
        state.motion = state.velocity + extra / dt;
        state.phase = (((state.phase + state.velocity * dt + extra) % total) + total) % total;

        var pace = Math.abs(state.motion) / Math.max(1, Math.abs(total / settings.duration));
        if (settings.sparkle && !reduce && state.reveal > 0.05) {
          state.emit += dt * (2 + 6 * Math.min(2, pace)) * settings.stars;
          while (state.emit > 1) {
            state.emit -= 1;
            starBorderPointAt(shape, state.phase + Math.floor(Math.random() * settings.stars) * spacing, point);
            spawnDust(point.x, point.y, point.nx, point.ny, state.motion);
          }
        }

        for (var dIdx = dust.length - 1; dIdx >= 0; dIdx--) {
          var mote = dust[dIdx];
          mote.age += dt;
          mote.x += mote.vx * dt;
          mote.y += mote.vy * dt;
          mote.vx *= Math.exp(-dt * 2.2);
          mote.vy *= Math.exp(-dt * 2.2);
          if (mote.age >= mote.life) dust.splice(dIdx, 1);
        }

        for (var pIdx = pulses.length - 1; pIdx >= 0; pIdx--) {
          pulses[pIdx].age += dt;
          if (pulses[pIdx].age >= 0.65) pulses.splice(pIdx, 1);
        }

        draw(shape);

        var settling = state.flash > 0.01 || pulses.length > 0 || dust.length > 0;
        var moving = Math.abs(state.motion) > 0.05 || cruise !== 0 || state.lap >= 0;
        if (state.visible && (settling || moving || state.hovered)) {
          raf = requestAnimationFrame(frame);
        }
      };

      var wake = function () {
        if (raf || !state.visible) return;
        last = performance.now();
        raf = requestAnimationFrame(frame);
      };

      var pulse = function (origin) {
        if (!settings.clickPulse) return;
        pulses.push({ origin: origin, age: 0 });
        if (pulses.length > 4) pulses.shift();
        state.flash = 1;
        wake();
      };

      btn.addEventListener('pointerenter', function () {
        state.hovered = true;
        if (settings.hover === 'lap' && state.lap < 0 && !reduce) state.lap = 0;
        wake();
      });

      btn.addEventListener('pointerleave', function () {
        state.hovered = false;
        wake();
      });

      btn.addEventListener('pointerdown', function (e) {
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        var rect = btn.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        pulse(starBorderProject(shapeFor(), x - settings.thickness / 2, y - settings.thickness / 2));
      });

      btn.addEventListener('click', function (e) {
        if (e.detail === 0) pulse(state.phase);
      });

      btn.addEventListener('focus', function () {
        if (btn.matches(':focus-visible') && settings.hover === 'lap' && state.lap < 0 && !reduce) {
          state.lap = 0;
        }
        wake();
      });

      var ro = new ResizeObserver(measure);
      ro.observe(btn);

      var io = new IntersectionObserver(function (entries) {
        state.visible = entries.some(function (entry) { return entry.isIntersecting; });
        if (state.visible) wake();
      });
      io.observe(btn);

      measure();
    });
  }

  /* ==========================================================================
     3. Magnet Physics Effect ([data-rb-magnet], .brand-link, etc.)
     ========================================================================== */

  var magnetRegistry = new Set();
  var magnetField = { pointer: null, owner: null };
  var magnetDetach = null;

  var magnetReach = function (rect, ptr) {
    var dx = ptr.x - (rect.left + rect.width / 2);
    var dy = ptr.y - (rect.top + rect.height / 2);
    var outside = Math.hypot(
      Math.max(0, Math.abs(dx) - rect.width / 2),
      Math.max(0, Math.abs(dy) - rect.height / 2)
    );
    return { dx: dx, dy: dy, outside: outside };
  };

  var magnetArbitrate = function () {
    var winner = null;
    var nearest = Infinity;
    var closest = Infinity;

    magnetRegistry.forEach(function (entry) {
      var near = null;
      var el = entry.el;
      if (magnetField.pointer && !isElementDisabled(el) && !entry.reduce) {
        near = magnetReach(el.getBoundingClientRect(), magnetField.pointer);
        if (near.outside > entry.padding) near = null;
      }
      if (!near) return;
      var center = Math.hypot(near.dx, near.dy);
      if (near.outside < nearest || (near.outside === nearest && center < closest)) {
        winner = entry;
        nearest = near.outside;
        closest = center;
      }
    });

    var prevOwner = magnetField.owner;
    magnetField.owner = winner;
    if (prevOwner && prevOwner !== winner) prevOwner.wake();
    if (winner) winner.wake();
  };

  var attachMagnetGlobal = function () {
    var onPointerMove = function (event) {
      if (event.pointerType === 'touch') {
        magnetField.pointer = null;
        magnetArbitrate();
        return;
      }
      magnetField.pointer = { x: event.clientX, y: event.clientY };
      magnetArbitrate();
    };

    var onLeave = function () {
      magnetField.pointer = null;
      magnetArbitrate();
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('scroll', magnetArbitrate, { passive: true, capture: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    window.addEventListener('blur', onLeave);

    return function () {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('scroll', magnetArbitrate, { capture: true });
      document.documentElement.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('blur', onLeave);
    };
  };

  var magnetInitialized = new WeakSet();

  function initMagnet(rootElement) {
    var selector = [
      '.hero-actions .btn',
      '.final-cta-actions .btn',
      '.bento-card .btn',
      '.brand-link',
      '[data-rb-magnet]'
    ].join(', ');

    var targets = rootElement
      ? [rootElement]
      : Array.from(document.querySelectorAll(selector));

    targets.forEach(function (el) {
      if (magnetInitialized.has(el)) return;
      magnetInitialized.add(el);

      el.classList.add('rb-magnet-host');

      var reduce = prefersReducedMotion();
      var padding = 60;
      var strength = 2.8;
      var maxOffset = 9;
      var stiffness = 170;
      var damping = 16;
      var mass = 1;

      var current = { x: 0, y: 0 };
      var velocity = { x: 0, y: 0 };
      var active = false;
      var raf = 0;
      var last = 0;

      var solve = function (target, dt) {
        var resting = true;
        ['x', 'y'].forEach(function (k) {
          var force = stiffness * (target[k] - current[k]) - damping * velocity[k];
          velocity[k] += (force / mass) * dt;
          current[k] += velocity[k] * dt;
          if (Math.abs(target[k] - current[k]) > 0.05 || Math.abs(velocity[k]) > 0.05) {
            resting = false;
          }
        });
        return resting;
      };

      var measure = function () {
        var target = { x: 0, y: 0 };
        if (isElementDisabled(el) || reduce || !magnetField.pointer) {
          return { target: target, engaged: false };
        }
        if (magnetField.owner !== entry) {
          return { target: target, engaged: false };
        }
        var rect = el.getBoundingClientRect();
        var near = magnetReach(rect, magnetField.pointer);
        if (near.outside > padding) {
          return { target: target, engaged: false };
        }
        var pull = padding > 0 ? 1 - smoothstep(padding * 0.5, padding, near.outside) : 1;
        var x = (near.dx / strength) * pull;
        var y = (near.dy / strength) * pull;
        var len = Math.hypot(x, y);
        if (len > maxOffset) {
          x *= maxOffset / len;
          y *= maxOffset / len;
        }
        target.x = x;
        target.y = y;
        return { target: target, engaged: true };
      };

      var applyTranslate = function () {
        if (Math.abs(current.x) < 0.05 && Math.abs(current.y) < 0.05 && !active) {
          el.style.translate = '';
        } else {
          el.style.translate = current.x.toFixed(2) + 'px ' + current.y.toFixed(2) + 'px';
        }
      };

      var frame = function (now) {
        raf = 0;
        var dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
        last = now;

        var m = measure();
        if (m.engaged !== active) {
          active = m.engaged;
          if (active) el.setAttribute('data-magnet-active', '');
          else el.removeAttribute('data-magnet-active');
        }

        var steps = Math.ceil(dt / (1 / 120));
        var resting = true;
        for (var i = 0; i < steps; i++) {
          resting = solve(m.target, dt / steps);
        }
        if (resting) {
          current.x = m.target.x;
          current.y = m.target.y;
          velocity.x = 0;
          velocity.y = 0;
        }
        applyTranslate();

        if (!resting) raf = requestAnimationFrame(frame);
        else last = 0;
      };

      var wake = function () {
        if (!raf) raf = requestAnimationFrame(frame);
      };

      var entry = { el: el, padding: padding, reduce: reduce, wake: wake };
      magnetRegistry.add(entry);
      if (!magnetDetach) magnetDetach = attachMagnetGlobal();
    });
  }

  /* ==========================================================================
     4. GlareHover Specular Streak + 1px Rim Glint
     ========================================================================== */

  var glareBump = function (t, center, half) {
    var distance = Math.abs(t - center);
    return distance >= half ? 0 : smootherstep(1 - distance / half);
  };

  var glareProfile = function (t, softness) {
    return glareBump(t, 0.5, 0.06 + 0.16 * softness) + 0.32 * glareBump(t, 0.5, 0.5);
  };

  var buildGlareGradient = function (r, g, b, opacity, softness) {
    var stops = [];
    for (var i = 0; i <= 32; i++) {
      var t = i / 32;
      var alpha = clamp(glareProfile(t, softness) * opacity, 0, 1);
      stops.push('rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha.toFixed(3) + ') ' + (t * 100).toFixed(1) + '%');
    }
    return 'linear-gradient(90deg, ' + stops.join(', ') + ')';
  };

  var glareEase = function (t) {
    return (1 - Math.cos(Math.PI * t)) / 2;
  };

  var glareInitialized = new WeakSet();

  function initGlareHover(rootElement) {
    var selector = [
      '.btn-secondary',
      '.btn-success',
      '.btn-danger',
      '.step-link',
      '[data-rb-glare]'
    ].join(', ');

    var targets = rootElement
      ? [rootElement]
      : Array.from(document.querySelectorAll(selector));

    targets.forEach(function (el) {
      if (glareInitialized.has(el)) return;
      // Skip if element has star border to preserve 48px bleed without overflow:hidden clipping
      if (el.classList.contains('rb-star-border') || el.classList.contains('btn-primary') || el.hasAttribute('data-rb-star-border')) {
        return;
      }
      glareInitialized.add(el);

      el.classList.add('rb-glare-host');

      var angle = -45;
      var opacity = 0.28;
      var size = 32;
      var softness = 0.6;
      var duration = 620;

      var glareSpan = el.querySelector('.rb-glare');
      if (!glareSpan) {
        glareSpan = document.createElement('span');
        glareSpan.className = 'rb-glare';
        glareSpan.setAttribute('aria-hidden', 'true');
        glareSpan.innerHTML = '<span class="rb-glare__band"></span><span class="rb-glare__rim"><span class="rb-glare__band rb-glare__band--rim"></span></span>';
        el.appendChild(glareSpan);
      }

      /* DOM Safety: re-append if button innerHTML changes */
      var observer = new MutationObserver(function () {
        if (glareSpan.parentNode !== el) {
          observer.disconnect();
          el.appendChild(glareSpan);
          observer.observe(el, { childList: true });
        }
      });
      observer.observe(el, { childList: true });

      var band = glareSpan.querySelector('.rb-glare__band:not(.rb-glare__band--rim)');
      var rimBand = glareSpan.querySelector('.rb-glare__band--rim');

      var streakGrad = buildGlareGradient(255, 255, 255, opacity, softness);
      var rimGrad = buildGlareGradient(255, 255, 255, Math.min(1, opacity * 1.8), softness);

      if (band) band.style.background = streakGrad;
      if (rimBand) rimBand.style.background = rimGrad;

      var reduced = prefersReducedMotion();
      var geometry = { band: 0, reach: 0, ux: 0, uy: -1, angle: angle };
      var state = { pos: -1e4, sweep: null };
      var raf = 0;
      var last = 0;

      var bands = function () {
        return [band, rimBand].filter(Boolean);
      };

      var write = function () {
        var transform = 'translate(-50%, -50%) rotate(' + (geometry.angle - 90) + 'deg) translateX(' + state.pos.toFixed(2) + 'px)';
        bands().forEach(function (b) {
          b.style.transform = transform;
        });
      };

      var measure = function () {
        var w = el.clientWidth;
        var h = el.clientHeight;
        var radians = (geometry.angle * Math.PI) / 180;
        geometry.ux = Math.sin(radians);
        geometry.uy = -Math.cos(radians);
        var diagonal = Math.hypot(w, h);
        geometry.band = Math.max(8, (diagonal * size) / 100);
        geometry.reach = (Math.abs(w * geometry.ux) + Math.abs(h * geometry.uy)) / 2 + geometry.band / 2 + 2;

        bands().forEach(function (b) {
          b.style.width = geometry.band + 'px';
          b.style.height = (diagonal + geometry.band) + 'px';
        });

        if (!state.sweep) {
          state.pos = state.pos > 0 ? geometry.reach : -geometry.reach;
        }
        write();
      };

      var frame = function (now) {
        last = now;
        var moving = false;
        if (state.sweep) {
          var sw = state.sweep;
          var t = Math.min(1, (now - sw.start) / sw.duration);
          state.pos = sw.from + (sw.to - sw.from) * glareEase(t);
          if (t < 1) moving = true;
          else state.sweep = null;
        }
        write();
        raf = moving ? requestAnimationFrame(frame) : 0;
      };

      var wake = function () {
        if (raf) return;
        last = performance.now();
        raf = requestAnimationFrame(frame);
      };

      var sweep = function (sign) {
        if (reduced || !geometry.reach || isElementDisabled(el)) return;
        glareSpan.style.opacity = '1';
        var end = sign * geometry.reach;
        var from = state.sweep || Math.abs(state.pos) < geometry.reach ? state.pos : -end;
        if (from === end) return;
        var share = Math.abs(end - from) / (2 * geometry.reach);
        state.sweep = {
          from: from,
          to: end,
          start: performance.now(),
          duration: Math.max(120, duration * share)
        };
        wake();
      };

      var along = function (event) {
        var rect = el.getBoundingClientRect();
        var dx = event.clientX - (rect.left + rect.width / 2);
        var dy = event.clientY - (rect.top + rect.height / 2);
        return dx * geometry.ux + dy * geometry.uy;
      };

      el.addEventListener('pointerenter', function (e) {
        sweep(along(e) > 0 ? -1 : 1);
      });

      el.addEventListener('pointerleave', function (e) {
        sweep(along(e) > 0 ? 1 : -1);
      });

      el.addEventListener('focusin', function (e) {
        if (e.target && e.target.matches && e.target.matches(':focus-visible')) {
          sweep(1);
        }
      });

      var ro = new ResizeObserver(measure);
      ro.observe(el);
      measure();
    });
  }

  /* ==========================================================================
     5. ClickSpark Interactive Burst (ClickSpark.jsx port)
     ========================================================================== */

  var SPARK_COLORS = ['#82B1E1', '#F5F5F5', '#4A85C5'];
  var sparkLayer = null;

  var getSparkLayer = function () {
    if (!sparkLayer || !sparkLayer.parentNode) {
      sparkLayer = document.querySelector('.rb-click-spark-layer');
      if (!sparkLayer) {
        sparkLayer = document.createElement('div');
        sparkLayer.className = 'rb-click-spark-layer';
        sparkLayer.setAttribute('aria-hidden', 'true');
        document.body.appendChild(sparkLayer);
      }
    }
    return sparkLayer;
  };

  var clickSparkBursts = [];
  var clickSparkRaf = 0;

  var triggerClickSpark = function (clientX, clientY) {
    if (prefersReducedMotion()) return;
    var layer = getSparkLayer();
    var count = 8;
    var radius = 28;
    var size = 11;
    var width = 1.8;
    var duration = 480;
    var glow = 0.45;

    var heading = -Math.PI / 2;
    var arc = Math.PI * 2;
    var step = arc / count;

    var sparks = [];
    for (var i = 0; i < count; i++) {
      var angle = heading + step * i + (Math.random() - 0.5) * 0.25;
      sparks.push({
        angle: angle,
        reach: 1 + (Math.random() - 0.5) * 0.2,
        scale: 1 + (Math.random() - 0.5) * 0.25,
        life: 1 + (Math.random() - 0.5) * 0.15,
        color: SPARK_COLORS[i % SPARK_COLORS.length]
      });
    }

    var reach = radius * 1.35 + size + width * 4 + 8;
    var box = {
      left: Math.max(clientX - reach, 0),
      top: Math.max(clientY - reach, 0),
      right: Math.min(clientX + reach, window.innerWidth),
      bottom: Math.min(clientY + reach, window.innerHeight)
    };

    if (box.right - box.left < 1 || box.bottom - box.top < 1) return;

    var ratio = Math.min(window.devicePixelRatio || 1, 2);
    var canvas = document.createElement('canvas');
    canvas.width = Math.ceil((box.right - box.left) * ratio);
    canvas.height = Math.ceil((box.bottom - box.top) * ratio);
    canvas.style.position = 'absolute';
    canvas.style.left = box.left + 'px';
    canvas.style.top = box.top + 'px';
    canvas.style.width = (box.right - box.left) + 'px';
    canvas.style.height = (box.bottom - box.top) + 'px';
    canvas.style.pointerEvents = 'none';
    canvas.setAttribute('aria-hidden', 'true');
    layer.appendChild(canvas);

    var ctx = canvas.getContext('2d');
    if (!ctx) {
      canvas.remove();
      return;
    }

    var burst = {
      x: clientX,
      y: clientY,
      start: performance.now(),
      sparks: sparks,
      duration: duration,
      radius: radius,
      size: size,
      width: width,
      glow: glow,
      canvas: canvas,
      ctx: ctx,
      ratio: ratio,
      left: box.left,
      top: box.top
    };

    clickSparkBursts.push(burst);
    if (!clickSparkRaf) clickSparkRaf = requestAnimationFrame(tickClickSparks);
  };

  var tickClickSparks = function (now) {
    clickSparkRaf = 0;
    for (var bIdx = clickSparkBursts.length - 1; bIdx >= 0; bIdx--) {
      var burst = clickSparkBursts[bIdx];
      var elapsed = now - burst.start;
      var ctx = burst.ctx;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, burst.canvas.width, burst.canvas.height);
      ctx.setTransform(burst.ratio, 0, 0, burst.ratio, -burst.left * burst.ratio, -burst.top * burst.ratio);

      var alive = false;
      var ringP = elapsed / (burst.duration * 0.75);
      if (ringP < 1) {
        alive = true;
        var rRad = 2 + burst.radius * 0.65 * (1 - Math.pow(1 - ringP, 3));
        ctx.globalAlpha = Math.pow(1 - ringP, 2) * 0.6;
        ctx.strokeStyle = burst.sparks[0].color;
        ctx.lineWidth = Math.max(0.5, burst.width * (1 - ringP));
        ctx.beginPath();
        ctx.arc(burst.x, burst.y, rRad, 0, Math.PI * 2);
        ctx.stroke();
      }

      for (var sIdx = 0; sIdx < burst.sparks.length; sIdx++) {
        var spark = burst.sparks[sIdx];
        var life = burst.duration * spark.life;
        var p = elapsed / life;
        if (p < 1) {
          alive = true;
          var easeP = 1 - Math.pow(1 - clamp(p, 0, 1), 3);
          var dist = burst.radius * spark.reach * easeP;
          var lag = Math.min(elapsed, 65 + burst.size * 3 * spark.scale);
          var backEase = 1 - Math.pow(1 - clamp((elapsed - lag) / life, 0, 1), 3);
          var backDist = burst.radius * spark.reach * backEase;

          var hx = burst.x + Math.cos(spark.angle) * dist;
          var hy = burst.y + Math.sin(spark.angle) * dist;
          var tx = burst.x + Math.cos(spark.angle) * backDist;
          var ty = burst.y + Math.sin(spark.angle) * backDist;

          var dx = hx - tx;
          var dy = hy - ty;
          var len = Math.hypot(dx, dy) || 1;
          var w = burst.width * spark.scale;
          var nx = (-dy / len) * w * 0.5;
          var ny = (dx / len) * w * 0.5;
          var fade = 1 - smoothstep(0.65, 1, p);

          var grad = ctx.createLinearGradient(tx, ty, hx, hy);
          grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
          grad.addColorStop(1, spark.color);

          if (burst.glow > 0) {
            ctx.globalAlpha = fade * 0.22 * burst.glow;
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(hx + nx * 2.8, hy + ny * 2.8);
            ctx.lineTo(hx - nx * 2.8, hy - ny * 2.8);
            ctx.closePath();
            ctx.fill();
          }

          ctx.globalAlpha = fade;
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(hx + nx, hy + ny);
          ctx.lineTo(hx - nx, hy - ny);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = spark.color;
          ctx.beginPath();
          ctx.arc(hx, hy, w * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1;
      if (!alive) {
        burst.canvas.remove();
        clickSparkBursts.splice(bIdx, 1);
      }
    }

    if (clickSparkBursts.length > 0) {
      clickSparkRaf = requestAnimationFrame(tickClickSparks);
    }
  };

  var clickSparkInitialized = false;

  function initClickSpark() {
    if (clickSparkInitialized) return;
    clickSparkInitialized = true;

    var selector = [
      '.btn',
      '.step-bullet',
      '.tab-btn',
      '.pcp-domino',
      '.mobile-menu-toggle',
      '[data-rb-spark]'
    ].join(', ');

    var lastPress = { time: -1e9, x: 0, y: 0 };

    window.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      var target = e.target.closest(selector);
      if (!target || isElementDisabled(target)) return;

      lastPress.time = performance.now();
      lastPress.x = e.clientX;
      lastPress.y = e.clientY;
      triggerClickSpark(e.clientX, e.clientY);
    }, { passive: true });

    window.addEventListener('click', function (e) {
      var target = e.target.closest(selector);
      if (!target || isElementDisabled(target)) return;

      if (e.detail === 0) {
        var rect = target.getBoundingClientRect();
        triggerClickSpark(rect.left + rect.width / 2, rect.top + rect.height / 2);
      } else {
        var recent = performance.now() - lastPress.time < 700 && Math.hypot(e.clientX - lastPress.x, e.clientY - lastPress.y) < 12;
        if (!recent) {
          triggerClickSpark(e.clientX, e.clientY);
        }
      }
    }, { passive: true });
  }

  /* ==========================================================================
     6. Public API & Auto-Initialization
     ========================================================================== */

  function initAll() {
    initWaves();
    initStarBorder();
    initMagnet();
    initGlareHover();
    initClickSpark();
  }

  window.ReactBits = {
    init: initAll,
    initWaves: initWaves,
    initStarBorder: initStarBorder,
    initMagnet: initMagnet,
    initGlareHover: initGlareHover,
    initClickSpark: initClickSpark,
    WAVES_PRESETS: WAVES_PRESETS
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();
