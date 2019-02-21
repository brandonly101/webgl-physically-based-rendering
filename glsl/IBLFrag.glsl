// Copyright 2015-2019 Brandon Ly all rights reserved.
//
// IBL environment map prefiltering fragment shader.
//
// Use Monte Carlo Integration over hemisphere of a normal to capture incoming radiance
// from environment map.
//
// Main implementation details inspired by work by Brian Karis at Epic Games
// (https://blog.selfshadow.com/publications/s2013-shading-course/karis/s2013_pbs_epic_notes_v2.pdf)
//

precision highp float;

uniform samplerCube UTexCubeEnv;
uniform float URoughness;
uniform int UIntegrateSpecBRDF;

varying vec3 VTextureCoordSkybox;

// Gamma decode and correct functions
highp vec4 gammaDecode(vec4 encoded) { return pow(encoded, vec4(2.2)); }
highp vec4 gammaCorrect(vec4 linear) { return pow(linear, vec4(1.0 / 2.2)); }

// Constants
const float PI = 3.1415927;

const int NUM_SAMPLES = 512;

// Hammersley functions

float VanDerCorpus(int n, int base)
{
    float invBase = 1.0 / float(base);
    float denom   = 1.0;
    float result  = 0.0;

    for (int i = 0; i < 32; i++)
    {
        if (n > 0)
        {
            denom   = mod(float(n), 2.0);
            result += denom * invBase;
            invBase = invBase / 2.0;
            n       = int(float(n) / 2.0);
        }
    }

    return result;
}

vec2 Hammersley(int i, int N)
{
    return vec2(float(i) / float(N), VanDerCorpus(i, 2));
}

// Helper functions

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

// An (optimized) version of evaluating a for shape-invariant NDFs.
// the squaring avoids an unnecessary square root, convenient in
// particular just for the GGX's lambda.
float aSquared(vec3 n, vec3 s, float alpha)
{
    float top = dot(n, s) * dot(n, s);
    float bot = alpha * alpha * (1.0 - top);
    return top / bot;
}

// GGX Lambda function, for use with Smith G2. Uses an a^2, described
// by the function above, for use with shape-invariant NDFs.
float GGXLambda(float aSquared)
{
    return (-1.0 + sqrt(1.0 + 1.0 / aSquared)) / 2.0;
}

// G2 Smith height-correlated masking-shadowing function (G function)
// Note that the G function is dependent on the D function, the one
// used here being GGX.
//
float SmithG2(vec3 l, vec3 v, vec3 m, float roughness)
{
    float MdotV = (dot(m, v) > 0.0 ? 1.0 : 0.0);
    float MdotL = (dot(m, l) > 0.0 ? 1.0 : 0.0);
    float alpha = roughness * roughness;

    float aSquaredV = aSquared(m, v, alpha);
    float aSquaredL = aSquared(m, l, alpha);

    return MdotV * MdotL / (1.0 + GGXLambda(aSquaredV) + GGXLambda(aSquaredL));
}

// Importance-sample function
//
// Grab an importance-sampled vector on a hemisphere about a normal N,
// based on the Hammersley point set. The distribution is that of a
// cosinus mapping. Affect it by roughness in a manner similar to
// how roughness affects the GGX distribution of normals (i.e. if
// roughness is closer to 0, sample points much closer about the
// normal, and if roughness is closer to 1, sample points more spread
// about a hemisphere).
//
vec3 GGXImportanceSample(vec2 HammersleyXi, vec3 N, float roughness, mat3 TBN)
{
    // Shortcut - if surface is completely smooth, we simply return the normal.
    if (roughness == 0.0)
    {
        return N;
    }

    float alpha = roughness * roughness;

    float cosTheta = sqrt((1.0 - HammersleyXi.x) / (1.0 + HammersleyXi.x * (alpha * alpha - 1.0))); // affect cosine based on roughness
    float sinTheta = sqrt(1.0 - cosTheta * cosTheta);
    float phi = 2.0 * PI * HammersleyXi.y;

    float x = sinTheta * cos(phi);
    float y = sinTheta * sin(phi);
    float z = cosTheta;
    vec3 tanHemiVector = vec3(x, y, z);

    // Transform sampled halfway from tangent into world space.
    vec3 H = normalize(TBN * tanHemiVector);

    return H;
}

// Shader Entry

void main(void)
{
    vec4 Color = vec4(0.0);

    // Specular IBL Environment Prefilter case
    if (UIntegrateSpecBRDF == 0)
    {
        // Use uniformly-distributed points on hemisphere centered around normal.
        vec3 N = normalize(VTextureCoordSkybox);
        vec3 V = N;
        vec3 R = V;

        // Create a TBN matrix. Tangent space is where Z+ is up.
        vec3 Up =  vec3(0.0, 0.0, 1.0); // Z is Up vector
        vec3 T = normalize(cross(Up, N));
        vec3 B = cross(N, T);
        mat3 TBN = mat3(T, B, N);

        float totalWeight = 0.0;
        for (int i = 0; i < NUM_SAMPLES; i++)
        {
            vec2 Xi = Hammersley(i, NUM_SAMPLES);
            vec3 H = GGXImportanceSample(Xi, N, URoughness, TBN);
            vec3 L = reflect(V, H) * -1.0;

            float NdotL = clamp(dot(N, L), 0.0, 1.0);
            if (NdotL > 0.0)
            {
                Color += gammaDecode(textureCube(UTexCubeEnv, L)) * NdotL;
                totalWeight += NdotL;
            }
        }

        Color /= totalWeight;
    }
    // Specular BRDF Integration (into 2D texture) case
    else
    {
        float NdotV = floor(gl_FragCoord.x) / 512.0;
        float Roughness = floor(gl_FragCoord.y) / 512.0;

        vec3 N = vec3(0.0, 0.0, 1.0);
        vec3 V = normalize(vec3(sqrt(1.0 - NdotV * NdotV), 0.0, NdotV));

        // Create a TBN matrix. Tangent space is where X+ is up.
        vec3 Up =  vec3(1.0, 0.0, 0.0); // X is Up vector
        vec3 T = normalize(cross(Up, N));
        vec3 B = cross(N, T);
        mat3 TBN = mat3(T, B, N);

        // Specular Color a.k.a. F0 scale and bias
        float SpecColorScale = 0.0;
        float SpecColorBias = 0.0;

        for (int i = 0; i < NUM_SAMPLES; i++)
        {
            vec2 Xi = Hammersley(i, NUM_SAMPLES);
            vec3 H = GGXImportanceSample(Xi, N, Roughness, TBN);
            vec3 L = reflect(V, H) * -1.0;

            float NdotL = clamp(dot(N, L), 0.0, 1.0);

            // Given within hemisphere, integrate about specular BRDF over PDF.
            //
            // Spec BRDF is F (factored out) * G / (4 * dot(N, L) * dot(N, V)) * D.
            // PDF is D * dot(N, H) / (4 * dot(V, H)). Therefore, SpecBRDF / PDF is
            // F (factored out) * G / (4 * dot(N, L) * dot(N, V)) * 4 * dot(V, H) / dot(N, H).
            //
            // For a full derivation of this integration (including how F is factored out),
            // see Brian Karis Epic Games tech paper linked above.
            //
            if (NdotL > 0.0)
            {
                float VdotH = clamp(dot(V, H), 0.0, 1.0);
                float NdotH = clamp(dot(N, H), 0.0, 1.0);

                float GDenom = SmithG2SpecBRDF(L, V, N, Roughness);
                float PDF = NdotH / (4.0 * VdotH);

                SpecColorScale += (1.0 - pow(1.0 - VdotH, 5.0)) * GDenom / PDF * NdotL;
                SpecColorBias += pow(1.0 - VdotH, 5.0) * GDenom / PDF * NdotL;
            }
        }

        SpecColorScale /= float(NUM_SAMPLES);
        SpecColorBias /= float(NUM_SAMPLES);
        Color.r = SpecColorScale;
        Color.g = SpecColorBias;
    }

    Color.a = 1.0;
    gl_FragColor = Color; // Output in linear color space.
}
