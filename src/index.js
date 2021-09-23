// A fork of https://github.com/Faboolea/shaders-on-scroll/
import "./styles.css";
import * as THREE from "three";
import { getProject, types as t } from "@theatre/core";
import studio from "@theatre/studio";
import audioUrl from "./music/audio.mp3";
import state from "./state.json";

studio.initialize();

const project = getProject("Demo", { state });
const sheet = project.sheet("Scene");

sheet.sequence.attachAudio({ source: audioUrl });

const nudgableNumber = (defaultValue) =>
  t.number(defaultValue, { nudgeMultiplier: 0.02 });

const vector3D = {
  x: nudgableNumber(0),
  y: nudgableNumber(0),
  z: nudgableNumber(0)
};

const obj = sheet.object("Shader", {
  uniforms: {
    uFrequency: nudgableNumber(0),
    uAmplitude: nudgableNumber(4),
    uDensity: nudgableNumber(1),
    uStrength: nudgableNumber(0),
    uDeepPurple: nudgableNumber(1),
    uOpacity: nudgableNumber(0.1),
    uBrightness: {
      // [0.1, 0.1, 0.9]
      x: nudgableNumber(0.1),
      y: nudgableNumber(0.1),
      z: nudgableNumber(0.9)
    }
  },

  transforms: {
    position: vector3D,
    rotation: vector3D,
    scale: {
      x: nudgableNumber(1),
      y: nudgableNumber(1),
      z: nudgableNumber(1)
    }
  }
});

const vertexShader = /*glsl*/ `
// GLSL textureless classic 3D noise "cnoise",
// with an RSL-style periodic variant "pnoise".
// Author:  Stefan Gustavson (stefan.gustavson@liu.se)
// Version: 2011-10-11
//
// Many thanks to Ian McEwan of Ashima Arts for the
// ideas for permutation and gradient selection.
//
// Copyright (c) 2011 Stefan Gustavson. All rights reserved.
// Distributed under the MIT license. See LICENSE file.
// https://github.com/ashima/webgl-noise
//
vec3 mod289(vec3 x)
{
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x)
{
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x)
{
  return mod289(((x*34.0)+1.0)*x);
}

vec4 taylorInvSqrt(vec4 r)
{
  return 1.79284291400159 - 0.85373472095314 * r;
}

vec3 fade(vec3 t) {
  return t*t*t*(t*(t*6.0-15.0)+10.0);
}

// Classic Perlin noise, periodic variant
float pnoise(vec3 P, vec3 rep)
{
  vec3 Pi0 = mod(floor(P), rep); // Integer part, modulo period
  vec3 Pi1 = mod(Pi0 + vec3(1.0), rep); // Integer part + 1, mod period
  Pi0 = mod289(Pi0);
  Pi1 = mod289(Pi1);
  vec3 Pf0 = fract(P); // Fractional part for interpolation
  vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.yy, Pi1.yy);
  vec4 iz0 = Pi0.zzzz;
  vec4 iz1 = Pi1.zzzz;

  vec4 ixy = permute(permute(ix) + iy);
  vec4 ixy0 = permute(ixy + iz0);
  vec4 ixy1 = permute(ixy + iz1);

  vec4 gx0 = ixy0 * (1.0 / 7.0);
  vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
  gx0 = fract(gx0);
  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0.0));
  gx0 -= sz0 * (step(0.0, gx0) - 0.5);
  gy0 -= sz0 * (step(0.0, gy0) - 0.5);

  vec4 gx1 = ixy1 * (1.0 / 7.0);
  vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
  gx1 = fract(gx1);
  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0.0));
  gx1 -= sz1 * (step(0.0, gx1) - 0.5);
  gy1 -= sz1 * (step(0.0, gy1) - 0.5);

  vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
  vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
  vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
  vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
  vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
  vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
  vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
  vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

  vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
  g000 *= norm0.x;
  g010 *= norm0.y;
  g100 *= norm0.z;
  g110 *= norm0.w;
  vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
  g001 *= norm1.x;
  g011 *= norm1.y;
  g101 *= norm1.z;
  g111 *= norm1.w;

  float n000 = dot(g000, Pf0);
  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
  float n111 = dot(g111, Pf1);

  vec3 fade_xyz = fade(Pf0);
  vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
  float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
  return 2.2 * n_xyz;
}

// https://github.com/dmnsgn/glsl-rotate
mat3 rotation3dY(float angle) {
    float s = sin(angle);
    float c = cos(angle);

    return mat3(
      c, 0.0, -s,
      0.0, 1.0, 0.0,
      s, 0.0, c
    );
  }
  
vec3 rotateY(vec3 v, float angle) {
  return rotation3dY(angle) * v;
}

uniform float uFrequency;
uniform float uAmplitude;
uniform float uDensity;
uniform float uStrength;

varying float vDistortion;

void main() {  
  float distortion = pnoise(normal * uDensity, vec3(10.)) * uStrength;

  vec3 pos = position + (normal * distortion);
  float angle = sin(uv.y * uFrequency) * uAmplitude;
  pos = rotateY(pos, angle);    
    
  vDistortion = distortion;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.);
}

`;

const fragmentShader = /*glsl*/ `
uniform float uOpacity;
uniform float uDeepPurple;
uniform vec3 uBrightness;
 
varying float vDistortion;

vec3 cosPalette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
  return a + b * cos(6.28318 * (c * t + d));
  
}     
 
void main() {
  float distort = vDistortion * 3.;

  // vec3 brightness = vec3(.1, .1, .9);
  vec3 contrast = vec3(.3, .3, .3);
  vec3 oscilation = vec3(.5, .5, .9);
  vec3 phase = vec3(.9, .1, .8);
 
  vec3 color = cosPalette(distort, uBrightness, contrast, oscilation, phase);
  
  gl_FragColor = vec4(color, vDistortion);
  gl_FragColor += vec4(min(uDeepPurple, 1.), 0., .5, min(uOpacity, 1.));
}

`;

class Demo {
  constructor() {
    this.viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    this.scene = new THREE.Scene();

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });

    this.canvas = this.renderer.domElement;

    this.camera = new THREE.PerspectiveCamera(
      75,
      this.viewport.width / this.viewport.height,
      0.1,
      10
    );

    this.clock = new THREE.Clock();

    this.update = this.update.bind(this);

    this.init();
  }

  init() {
    this.addCanvas();
    this.addCamera();
    this.addMesh();

    this.onResize();
    this.update();

    window.addEventListener("resize", this.onResize.bind(this));
  }

  addCanvas() {
    this.canvas.classList.add("webgl");
    document.body.appendChild(this.canvas);
  }

  addCamera() {
    this.camera.position.set(0, 0, 2.5);
    this.scene.add(this.camera);
  }

  addMesh() {
    this.geometry = new THREE.IcosahedronGeometry(1, 64);

    this.material = new THREE.ShaderMaterial({
      wireframe: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      vertexShader,
      fragmentShader,
      uniforms: {
        uFrequency: { value: 0.0 },
        uAmplitude: { value: 0.0 },
        uDensity: { value: 0.0 },
        uStrength: { value: 0.0 },
        uDeepPurple: { value: 0.0 },
        uOpacity: { value: 0.0 },
        uBrightness: { value: [0.1, 0.1, 0.9] }
      }
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    console.log(this.mesh.rotation);

    this.scene.add(this.mesh);

    const uniforms = this.material.uniforms;

    obj.onValuesChange((v) => {
      for (const [transform, value] of Object.entries(v.transforms)) {
        this.mesh[transform].set(value.x, value.y, value.z);
      }

      for (const [uniformName, uniformValue] of Object.entries(v.uniforms)) {
        uniforms[uniformName].value = uniformValue;
      }
    });
  }

  onResize() {
    this.viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    if (this.viewport.width < this.viewport.height) {
      this.mesh.scale.set(0.75, 0.75, 0.75);
    } else {
      this.mesh.scale.set(1, 1, 1);
    }

    this.camera.aspect = this.viewport.width / this.viewport.height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(this.viewport.width, this.viewport.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  }

  /**
   * LOOP
   */
  update() {
    // const elapsedTime = this.clock.getElapsedTime();

    this.render();

    window.requestAnimationFrame(this.update);
  }

  /**
   * RENDER
   */
  render() {
    this.renderer.render(this.scene, this.camera);
  }
}

new Demo();

console.log(
  "%c Made by ꜰᴀʙᴏᴏʟᴇᴀ → https://twitter.com/faboolea",
  "background: black; color: white; padding: 1ch 2ch; border-radius: 2rem;"
);
