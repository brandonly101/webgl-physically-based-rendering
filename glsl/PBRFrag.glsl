#version 300 es

// Copyright 2015 Brandon Ly all rights reserved.
//
// Fragment shader.
//
precision highp float;

const float PI = 3.1415927;

// Uniforms
uniform mat4 UMatModel;
uniform mat4 UMatView;
uniform mat4 UMatMV;
uniform mat4 UMatNormal;

uniform samplerCube UTexCubeEnv;
uniform samplerCube UTexCubeIrradiance;
uniform samplerCube UTexCubeSpecIBL;
uniform sampler2D UTextureEnvBRDF;

uniform sampler2D UTextureBaseColor;
uniform sampler2D UTextureNormal;
uniform sampler2D UTextureMetallic;
uniform sampler2D UTextureRoughness;

uniform float UEnvMipLevels;
uniform float UEnvMipLevelsMin;

uniform int UOverride;
uniform int UUseWorldSpace;
uniform vec3 UColor;
uniform float UMetallic;
uniform float URoughness;

// Variables passed from vert to pixel
in vec3 VTextureCoordSkybox;
in vec2 VVertexTexCoord;

in vec3 VTanLightDir;
in vec3 VTanViewDir;

in mat3 VTBN;

in vec3 VWorldN;
in vec3 VWorldV;
in vec3 VWorldL;
in vec3 VWorldI;

out vec4 Color;

// Gamma decode and correct functions
highp vec4 gammaDecode(vec4 encoded) { return pow(encoded, vec4(2.2)); }
highp vec4 gammaCorrect(vec4 linear) { return pow(linear, vec4(1.0 / 2.2)); }

// Physically-based rendering functions

// Schlick's Approximation (of Fresnel Reflectance) (F function).
//
vec3 SchlickApprox(vec3 n, vec3 l, vec3 F0)
{
    // More intuitively, lerp(F0, <white>, pow(1.0 - dot(n, l), 5.0))
    return F0 + (1.0 - F0) * pow(1.0 - max(0.0, dot(n, l)), 5.0);
}

// Schlick's Approximation w/ parameterization for roughness. For use specifically
// with diffuse irradiance.
vec3 SchlickApproxRoughness(vec3 n, vec3 l, vec3 F0, float roughness)
{
    return F0 + (max(vec3(1.0 - roughness), F0) - F0) * pow(1.0 - max(0.0, dot(n, l)), 5.0);
}

// Combined G2 Smith height-correlated masking-shadowing function and
// specular microfacet BRDF denominator (G function) (denom is
// 4 * NdotL * NdotV). Note that the G function is dependent on the
// D function (where GGX is used), and that this function is optimized
// with the use of D GGX in mind.
//
float SmithG2SpecBRDF(vec3 l, vec3 v, vec3 n, float roughness)
{
    float NdotL = abs(dot(n, l));
    float NdotV = abs(dot(n, v));
    float a = roughness * roughness;
    return 0.5 / mix(2.0 * NdotL * NdotV, NdotL + NdotV, a);
}

// GGX (Trowbridge & Reitz) Distribution (D function)
float GGX(vec3 n, vec3 m, float roughness)
{
    float a = roughness * roughness;
    float a2 = a * a;
    float num = (dot(n, m) > 0.0 ? 1.0 : 0.0) * a2;
    float denom = PI * pow(1.0 + pow(dot(n, m), 2.0) * (a2 - 1.0), 2.0);
    return num / denom;
}

// Reflectance Equation - Outgoing Radiance function (Lo)
vec3 RadianceOut(vec3 l, vec3 v, vec3 n, vec3 worldI, vec3 worldN, vec3 albedo, float metallic, float roughness)
{
    // Clamp roughness to close to 0 to avoid specular anomolies
    roughness = clamp(roughness, 0.05, 1.0);

    // Microfacet BRDF calculations
    vec3 h = normalize(l + v); // halfway vector
    vec3 F0 = mix(vec3(0.04), albedo, metallic); // specular color
    albedo *= (1.0 - metallic); // the more metallic a material is, the less albedo is factored.
    vec3 F = SchlickApprox(h, l, F0);
    float GDenom = SmithG2SpecBRDF(l, v, n, roughness);
    float D = GGX(n, h, roughness);

    // Specular BRDF
    vec3 BRDFSpecular = F * GDenom * D;

    // Diffuse Lambertian BRDF
    vec3 BRDFDiffuse = albedo / PI * (1.0 - F); // 1 - F is diffuse contribution

    // Diffuse irradiance. By multiplying it by the diffuse BRDF (with an included
    // 1 / PI term), we turn it back into radiance.
    vec3 FEnv = SchlickApproxRoughness(n, v, F0, roughness);
    vec3 BRDFDiffuseEnv = albedo / PI * (1.0 - FEnv);
    vec3 DiffuseIrradiance = texture(UTexCubeIrradiance, worldN).rgb * BRDFDiffuseEnv;

    // Specular Image-based Lighting
    vec3 R = reflect(worldI, worldN);
    float envMipMax = UEnvMipLevels - 1.0 - UEnvMipLevelsMin;
    vec3 prefilterColor = textureLod(UTexCubeSpecIBL, R, roughness * envMipMax).rgb;
    vec2 envBRDF = texture(UTextureEnvBRDF, vec2(max(dot(n, v), 0.0), roughness)).rg;
    vec3 SpecularIBL = prefilterColor * (F0 * envBRDF.r + envBRDF.g);

    float NdotL = clamp(dot(n, l), 0.0, 1.0);
    return PI * (BRDFDiffuse + BRDFSpecular) * NdotL + DiffuseIrradiance + SpecularIBL;
}

// Main entry point for pixel shader
void main(void)
{
    vec3 normalMap = texture(UTextureNormal, VVertexTexCoord).rgb; // Normal map
    vec3 TanNormalDir = normalize(normalMap * 2.0 - 1.0); // Shift range of normal map
    vec4 ColorBase = gammaDecode(texture(UTextureBaseColor, VVertexTexCoord)); // Gamma uncorrect
    float Metallic = texture(UTextureMetallic, VVertexTexCoord).r; // Only need to grab one channel
    float Roughness = texture(UTextureRoughness, VVertexTexCoord).g; // Also only need to grab one channel

    // vec3 ColorDirLight = vec3(1.0); // TODO: Add parameterization for affecting the directional light

    // Determine the light, view, and normal vectors and PBR parameters
    vec3 L = normalize(VTanLightDir);
    vec3 V = normalize(VTanViewDir);
    vec3 N = normalize(TanNormalDir);
    vec3 WorldN = normalize(VTBN * N); // Grab a world-space vector for environment map lookups.
    if (UUseWorldSpace == 1) // For some models (i.e. sphere), easier to use world space coordinates
    {
        L = normalize(VWorldL);
        V = normalize(VWorldV);
        N = normalize(VWorldN);
        WorldN = N;
    }
    ColorBase.rgb *= UColor;
    if (UOverride == 1)
    {
        Metallic = UMetallic;
        Roughness = URoughness;
    }

    // Set the final pixel color
    Color = vec4(0.0);
    Color.rgb = RadianceOut(L, V, N, VWorldI, WorldN, ColorBase.rgb, Metallic, Roughness);
    // Color.rgb *= ColorDirLight; // TODO: Add parameterization for affecting the directional light

    Color = clamp(Color, 0.0, 1.0); // Clamp to RGB color range

    Color = gammaCorrect(Color); // gamma correct
    // Color.rgb = vec3(Metallic);
    Color.a = 1.0;
}
