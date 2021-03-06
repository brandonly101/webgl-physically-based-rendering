// Copyright 2015-2018 Brandon Ly all rights reserved.
//
// Skybox fragment shader.
//
precision mediump float;

uniform samplerCube UTexCubeEnv;
varying vec3 VTextureCoordSkybox;

void main(void)
{
    gl_FragColor = textureCube(UTexCubeEnv, VTextureCoordSkybox);
}
