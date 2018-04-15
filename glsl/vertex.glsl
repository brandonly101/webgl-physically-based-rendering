// Copyright 2015 Brandon Ly all rights reserved.
//
// Vertex shader.
//

attribute vec3 AVertexPosition;
attribute vec3 AVertexNormal;
attribute vec2 ATextureCoord;

uniform vec4 UCamPosition;
uniform vec4 UCamPosSky;
uniform vec4 ULightPosition;
uniform mat4 UMatModel, UMatView, UMatProj;
uniform mat4 UMatNormal;

varying vec3 L, N, E, I;
varying vec3 VTextureCoordSkybox;

void main(void)
{
    // Calculate the position and normals to pass into the fragment shader.
    vec3 PosTransform = vec3(UMatModel * vec4(AVertexPosition, 1.0));
    vec3 NormTransform = vec3(UMatNormal * vec4(AVertexNormal, 1.0));
    vec3 LightTransform = (ULightPosition).xyz;

    L = normalize(LightTransform - PosTransform);
    N = normalize(NormTransform);
    E = normalize(UCamPosition.xyz - PosTransform);

    // Calculate environment mapping variables.
    I = normalize(PosTransform - UCamPosSky.xyz);

    gl_Position = UMatProj * UMatView * UMatModel * vec4(AVertexPosition, 1.0);
}
