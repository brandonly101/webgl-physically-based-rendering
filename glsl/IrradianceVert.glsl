// Copyright 2015-2019 Brandon Ly all rights reserved.
//
// Irradiance vertex shader.
//

attribute vec3 AVertexPosition;

uniform mat4 UMatMVP;

varying vec3 VTextureCoordSkybox;

void main(void)
{
    VTextureCoordSkybox = vec3(-AVertexPosition.x, AVertexPosition.y, AVertexPosition.z);
    gl_Position = UMatMVP * vec4(AVertexPosition, 1.0);
}
