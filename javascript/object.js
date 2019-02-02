// Copyright Brandon Ly 2015 all rights reserved.

// Small module that handles the creation of meshes and objects and their properties.

"use strict";

// Define a mesh object class.
class Mesh
{
    constructor()
    {
        this.meshParts = null;

        this.bUseDrawArrays = false;
    }

    // Create a mesh from a source file.
    static createMesh(srcMesh, materials, bUseDrawArrays = false)
    {
        var result = new Mesh();
        result.bUseDrawArrays = bUseDrawArrays;

        let vertices = [];
        let texcoords = [];
        let normals = [];
        let faceVertices = [];
        let materialFaceIndices = [];
        let similarVertices = {};

        var arrObjLines = FileUtil.GetFile(srcMesh).split("\n");
        var faceToRender = 0;
        arrObjLines.forEach((elem) =>
        {
            let arrElem = elem.split(" ");
            switch (arrElem[0])
            {
            case "g":
            case "o":
                materialFaceIndices.push(faceVertices.length);
                break;
            case "v":
                vertices.push(
                {
                    "x": Number.parseFloat(arrElem[1]),
                    "y": Number.parseFloat(arrElem[2]),
                    "z": Number.parseFloat(arrElem[3])
                });
                break;
            case "vt":
                texcoords.push(
                {
                    "u": Number.parseFloat(arrElem[1]),
                    "v": 1.0 - Number.parseFloat(arrElem[2])
                });
                break;
            case "vn":
                normals.push(
                {
                    "x": Number.parseFloat(arrElem[1]),
                    "y": Number.parseFloat(arrElem[2]),
                    "z": Number.parseFloat(arrElem[3])
                });
                break;
            case "f":
                for (let i = 1; i < arrElem.length; i++)
                {
                    let vertexIndex = 0;
                    let texcoordIndex = 0;
                    let normalIndex = 0;

                    let arrFaces = arrElem[i].split("/");
                    vertexIndex = Number.parseInt(arrFaces[0]) - 1;
                    if (!Number.isNaN(Number.parseFloat(arrFaces[1])))
                    {
                        texcoordIndex = Number.parseFloat(arrFaces[1]) - 1;
                    }
                    if (!Number.isNaN(Number.parseInt(arrFaces[2])))
                    {
                        normalIndex = Number.parseInt(arrFaces[2]) - 1;
                    }

                    // Add face vertex w/ similar normals
                    if (similarVertices[texcoordIndex] === undefined)
                    {
                        similarVertices[texcoordIndex] = [];
                    }
                    similarVertices[texcoordIndex].push(faceVertices.length);

                    // Face may have more than 3 vertices because OBJ is weird ... if so,
                    // simply add another triangle (as in, pick two older vertices and then
                    // lop on the newer one past 3).
                    if (i > 3)
                    {
                        let f1 = {};
                        let f2 = {};
                        Object.assign(f1, faceVertices[faceVertices.length - 3]);
                        Object.assign(f2, faceVertices[faceVertices.length - 1]);
                        faceVertices.push(f1);
                        faceVertices.push(f2);
                    }

                    faceVertices.push(
                    {
                        "vertexIndex": vertexIndex,
                        "texcoordIndex": texcoordIndex,
                        "normalIndex": normalIndex
                    });
                }
                break;
            }
        });

        result.meshParts = [];
        let meshPart;
        let meshPartLastIndex = 0;
        for (let i = 0; i < faceVertices.length; i++)
        {
            if (i == materialFaceIndices[result.meshParts.length])
            {
                result.meshParts.push({});
                meshPart = result.meshParts[result.meshParts.length - 1];
                meshPart.material = materials[result.meshParts.length - 1];

                meshPart.vertices = [];
                meshPart.texcoords = [];
                meshPart.normals = [];
                meshPart.indices = [];
                meshPart.tangents = [];
                meshPart.lastIndex = i;

                meshPartLastIndex = i;
            }

            let faceVertex = faceVertices[i];

            meshPart.vertices.push(vertices[faceVertex.vertexIndex].x);
            meshPart.vertices.push(vertices[faceVertex.vertexIndex].y);
            meshPart.vertices.push(vertices[faceVertex.vertexIndex].z);

            if (texcoords.length !== 0)
            {
                meshPart.texcoords.push(texcoords[faceVertex.texcoordIndex].u);
                meshPart.texcoords.push(texcoords[faceVertex.texcoordIndex].v);
            }

            if (normals.length !== 0)
            {
                meshPart.normals.push(normals[faceVertex.normalIndex].x);
                meshPart.normals.push(normals[faceVertex.normalIndex].y);
                meshPart.normals.push(normals[faceVertex.normalIndex].z);
            }
            else
            {
                meshPart.normals.push(0);
                meshPart.normals.push(0);
                meshPart.normals.push(0);
            }

            if (!result.bUseDrawArrays)
            {
                meshPart.indices.push(i - meshPartLastIndex);
            }

            // Calculate and add tangents and bitangents
            if (i % 3 === 0)
            {
                const face1 = faceVertices[i + 0];
                const face2 = faceVertices[i + 1];
                const face3 = faceVertices[i + 2];

                const edge1 =
                {
                    x: vertices[face2.vertexIndex].x - vertices[face1.vertexIndex].x,
                    y: vertices[face2.vertexIndex].y - vertices[face1.vertexIndex].y,
                    z: vertices[face2.vertexIndex].z - vertices[face1.vertexIndex].z
                };

                const edge2 =
                {
                    x: vertices[face3.vertexIndex].x - vertices[face2.vertexIndex].x,
                    y: vertices[face3.vertexIndex].y - vertices[face2.vertexIndex].y,
                    z: vertices[face3.vertexIndex].z - vertices[face2.vertexIndex].z
                };

                const dU1 = texcoords[face2.texcoordIndex].u - texcoords[face1.texcoordIndex].u;
                const dU2 = texcoords[face3.texcoordIndex].u - texcoords[face2.texcoordIndex].u;
                const dV1 = texcoords[face2.texcoordIndex].v - texcoords[face1.texcoordIndex].v;
                const dV2 = texcoords[face3.texcoordIndex].v - texcoords[face2.texcoordIndex].v;

                const det = 1.0 / (dU1 * dV2 - dU2 * dV1);
                let tangent =
                [
                    det * (edge1.x * dV2 - edge2.x * dV1),
                    det * (edge1.y * dV2 - edge2.y * dV1),
                    det * (edge1.z * dV2 - edge2.z * dV1)
                ];
                // tangent = GLMathLib.normalize(tangent);

                let bitangent =
                [
                    det * (edge2.x * dU1 - edge1.x * dU2),
                    det * (edge2.y * dU1 - edge1.y * dU2),
                    det * (edge2.z * dU1 - edge1.z * dU2)
                ];
                // bitangent = GLMathLib.normalize(bitangent);

                // For now, each vertex of the face will have the same tangent vector
                for (let a = 0; a < 3; a++)
                {
                    let normal =
                    [
                        normals[faceVertices[i + a].normalIndex].x,
                        normals[faceVertices[i + a].normalIndex].y,
                        normals[faceVertices[i + a].normalIndex].z
                    ];

                    meshPart.tangents.push(tangent[0]);
                    meshPart.tangents.push(tangent[1]);
                    meshPart.tangents.push(tangent[2]);
                    meshPart.tangents.push(GLMathLib.dot(GLMathLib.cross(normal, tangent), bitangent) < 0.0 ? -1.0 : 1.0);
                }
            }
        }

        // Average out the tangent vectors of similar vertices
        for (let key in similarVertices)
        {
            const arrFaceVertexIndices = similarVertices[key];
            let countLeft = 0;
            let countRight = 0;
            let avgTangentLeft = [0, 0, 0];
            let avgTangentRight = [0, 0, 0];

            // Find average tangent vector of similar vertices
            for (let i = 0; i < arrFaceVertexIndices.length; i++)
            {
                const index = arrFaceVertexIndices[i];

                for (let j = 0; j < result.meshParts.length; j++)
                {
                    if (j + 1 == result.meshParts.length ||
                        index < result.meshParts[j + 1].lastIndex)
                    {
                        const pseudoModuloIndex = index - result.meshParts[j].lastIndex;
                        if (result.meshParts[j].tangents[pseudoModuloIndex * 4 + 3] == 1.0)
                        {
                            avgTangentRight[0] += result.meshParts[j].tangents[pseudoModuloIndex * 4 + 0];
                            avgTangentRight[1] += result.meshParts[j].tangents[pseudoModuloIndex * 4 + 1];
                            avgTangentRight[2] += result.meshParts[j].tangents[pseudoModuloIndex * 4 + 2];
                            countRight++;
                        }
                        else
                        {
                            avgTangentLeft[0] += result.meshParts[j].tangents[pseudoModuloIndex * 4 + 0];
                            avgTangentLeft[1] += result.meshParts[j].tangents[pseudoModuloIndex * 4 + 1];
                            avgTangentLeft[2] += result.meshParts[j].tangents[pseudoModuloIndex * 4 + 2];
                            countLeft++
                        }
                        break;
                    }
                }
            }
            avgTangentLeft = GLMathLib.mult(1 / countLeft, avgTangentLeft);
            avgTangentRight = GLMathLib.mult(1 / countRight, avgTangentRight);

            // Set the tangent vectors of similar vertices to the average tangent vector
            for (let i = 0; i < arrFaceVertexIndices.length; i++)
            {
                const index = arrFaceVertexIndices[i];

                for (let j = 0; j < result.meshParts.length; j++)
                {
                    if (j + 1 == result.meshParts.length ||
                        index < result.meshParts[j + 1].lastIndex)
                    {
                        const pseudoModuloIndex = index - result.meshParts[j].lastIndex;
                        if (result.meshParts[j].tangents[pseudoModuloIndex * 4 + 3] == 1.0)
                        {
                            result.meshParts[j].tangents[pseudoModuloIndex * 4 + 0] = avgTangentRight[0];
                            result.meshParts[j].tangents[pseudoModuloIndex * 4 + 1] = avgTangentRight[1];
                            result.meshParts[j].tangents[pseudoModuloIndex * 4 + 2] = avgTangentRight[2];
                        }
                        else
                        {
                            result.meshParts[j].tangents[pseudoModuloIndex * 4 + 0] = avgTangentLeft[0];
                            result.meshParts[j].tangents[pseudoModuloIndex * 4 + 1] = avgTangentLeft[1];
                            result.meshParts[j].tangents[pseudoModuloIndex * 4 + 2] = avgTangentLeft[2];
                        }
                        break;
                    }
                }
            }
        }

        return result;
    };

    // Create a cube mesh.
    static createCube()
    {
        var result = new Mesh();
        result.meshParts = [{}];

        result.meshParts[0].vertices =
        [
            // Front face
            -1.0, -1.0,  1.0,
            1.0, -1.0,  1.0,
            1.0,  1.0,  1.0,
            -1.0,  1.0,  1.0,

            // Back face
            -1.0, -1.0, -1.0,
            -1.0,  1.0, -1.0,
            1.0,  1.0, -1.0,
            1.0, -1.0, -1.0,

            // Top face
            -1.0,  1.0, -1.0,
            -1.0,  1.0,  1.0,
            1.0,  1.0,  1.0,
            1.0,  1.0, -1.0,

            // Bottom face
            -1.0, -1.0, -1.0,
            1.0, -1.0, -1.0,
            1.0, -1.0,  1.0,
            -1.0, -1.0,  1.0,

            // Right face
            1.0, -1.0, -1.0,
            1.0,  1.0, -1.0,
            1.0,  1.0,  1.0,
            1.0, -1.0,  1.0,

            // Left face
            -1.0, -1.0, -1.0,
            -1.0, -1.0,  1.0,
            -1.0,  1.0,  1.0,
            -1.0,  1.0, -1.0
        ];

        result.meshParts[0].normals =
        [
            // Front face
            0.0, 0.0, 1.0,
            0.0, 0.0, 1.0,
            0.0, 0.0, 1.0,
            0.0, 0.0, 1.0,

            // Back Face
            0.0, 0.0, -1.0,
            0.0, 0.0, -1.0,
            0.0, 0.0, -1.0,
            0.0, 0.0, -1.0,

            // Top Face
            0.0, 1.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 1.0, 0.0,

            // Bottom face
            0.0, -1.0, 0.0,
            0.0, -1.0, 0.0,
            0.0, -1.0, 0.0,
            0.0, -1.0, 0.0,

            // Right face
            1.0, 0.0, 0.0,
            1.0, 0.0, 0.0,
            1.0, 0.0, 0.0,
            1.0, 0.0, 0.0,

            // Left face
            -1.0, 0.0, 0.0,
            -1.0, 0.0, 0.0,
            -1.0, 0.0, 0.0,
            -1.0, 0.0, 0.0,
        ];

        result.meshParts[0].indices =
        [
            0,  1,  2,      0,  2,  3,    // front
            4,  5,  6,      4,  6,  7,    // back
            8,  9,  10,     8,  10, 11,   // top
            12, 13, 14,     12, 14, 15,   // bottom
            16, 17, 18,     16, 18, 19,   // right
            20, 21, 22,     20, 22, 23    // left
        ];

        return result;
    }

    // Create a sphere mesh.
    static createSphere(nDiv, material, bUseDrawArrays = false)
    {
        var result = new Mesh();
        result.bUseDrawArrays = bUseDrawArrays;

        result.meshParts = [{}];
        result.meshParts[0].material = material;

        let vertices = [];
        let normals = [];
        let indices = [];

        var va = [0, 0, -1];
        var vb = [0.0, 0.942809, 0.333333];
        var vc = [-0.816497, -0.471405, 0.333333];
        var vd = [0.816497, -0.471405, 0.333333];

        function tetrahedron(a, b, c, d, n)
        {
            function triangle(a, b, c)
            {
                // Vertices
                indices.push(vertices.length/3);
                vertices = vertices.concat(a);
                indices.push(vertices.length/3);
                vertices = vertices.concat(b);
                indices.push(vertices.length/3);
                vertices = vertices.concat(c);

                // Normals
                normals = normals.concat(a);
                normals = normals.concat(b);
                normals = normals.concat(c);
            }
            function divideTriangle(a, b, c, count)
            {
                if (count > 0)
                {
                    var ab = GLMathLib.normalize(GLMathLib.mid(a, b));
                    var ac = GLMathLib.normalize(GLMathLib.mid(a, c));
                    var bc = GLMathLib.normalize(GLMathLib.mid(b, c));
                    divideTriangle(a, ab, ac, count - 1);
                    divideTriangle(ab, b, bc, count - 1);
                    divideTriangle(bc, c, ac, count - 1);
                    divideTriangle(ab, bc, ac, count - 1);
                } else {
                    triangle (a, b, c);
                }
            }
            divideTriangle(a, b, c, n);
            divideTriangle(d, c, b, n);
            divideTriangle(a, d, b, n);
            divideTriangle(a, c, d, n);
        }

        // Run the function that calls it all.
        tetrahedron(va, vb, vc, vd, nDiv);

        result.meshParts[0].vertices = vertices;
        result.meshParts[0].normals = normals;
        result.meshParts[0].indices = indices;

        return result;
    }

    // Create a cube map mesh.
    static createCubeMap(length, material)
    {
        var result = new Mesh();
        result.meshParts = [{}];

        result.meshParts[0].vertices =
        [
            // Front face
            -length, -length, -length,
            length, -length, -length,
            length,  length, -length,
            -length,  length, -length,

            // Back face
            -length, -length,  length,
            -length,  length,  length,
            length,  length,  length,
            length, -length,  length,

            // Top face
            -length, -length, -length,
            -length, -length,  length,
            length, -length,  length,
            length, -length, -length,

            // Bottom face
            -length,  length, -length,
            length,  length, -length,
            length,  length,  length,
            -length,  length,  length,

            // Right face
            -length, -length, -length,
            -length,  length, -length,
            -length,  length,  length,
            -length, -length,  length,

            // Left face
            length, -length, -length,
            length, -length,  length,
            length,  length,  length,
            length,  length, -length,
        ];
        result.meshParts[0].texCoords = [result.meshParts[0].vertices];
        result.meshParts[0].indices =
        [
            0,  1,  2,      0,  2,  3,    // front
            4,  5,  6,      4,  6,  7,    // back
            8,  9,  10,     8,  10, 11,   // top
            12, 13, 14,     12, 14, 15,   // bottom
            16, 17, 18,     16, 18, 19,   // right
            20, 21, 22,     20, 22, 23    // left
        ];
        result.meshParts[0].material = material;

        return result;
    };

    readFile(e)
    {
        var file = e.target.files[0];
        if (!file)
        {
            return;
        }
        var reader = new FileReader();
        reader.onload = function(e)
        {
            var contents = e.target.result;
            displayContents(contents);
        };
        reader.readAsText(file);
    };
}

class RenderObject
{
    constructor(gl,
                mesh)
    {
        this.gl = gl;
        this.mesh = mesh;
        this.bufferParts = [];

        for (let i = 0; i < mesh.meshParts.length; i++)
        {
            let buffers = {};
            const meshPart = mesh.meshParts[i];

            // Create vertices buffer.
            buffers.vertices = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vertices);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(meshPart.vertices), gl.STATIC_DRAW);

            if (meshPart.texcoords != null)
            {
                buffers.texcoords = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, buffers.texcoords);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(meshPart.texcoords), gl.STATIC_DRAW);
            }

            // Create normals buffer, if applicable.
            if (meshPart.normals != null)
            {
                buffers.normals = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normals);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(meshPart.normals), gl.STATIC_DRAW);
            }

            if (!mesh.bUseDrawArrays)
            {
                // Create vertex indices buffer.
                buffers.indices = gl.createBuffer();
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(meshPart.indices), gl.STATIC_DRAW);
            }

            if (meshPart.tangents != null)
            {
                buffers.tangents = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, buffers.tangents);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(meshPart.tangents), gl.STATIC_DRAW);
            }

            this.bufferParts.push(buffers);
        }
    }

    setUniformValue(name, value)
    {
        const mesh = this.mesh;

        for (let i = 0; i < mesh.meshParts.length; i++)
        {
            const material = mesh.meshParts[i].material;

            if (material !== null)
            {
                const uniforms = material.shaderProgramObject.uniforms;

                if (name in uniforms)
                {
                    uniforms[name].value = value;
                }
            }
        }
    }

    render()
    {
        const gl = this.gl;
        const mesh = this.mesh;
        const bufferParts = this.bufferParts;

        for (let i = 0; i < mesh.meshParts.length; i++)
        {
            const meshPart = mesh.meshParts[i];

            // Early break if mesh part has no associated material.
            if (meshPart.material == null)
            {
                continue;
            }

            const buffers = bufferParts[i];
            const attributes = meshPart.material.shaderProgramObject.attributes;

            // Activate the WebGL shader program object.
            gl.useProgram(meshPart.material.shaderProgramObject.glShaderProgram);

            meshPart.material.shaderProgramObject.setUniforms();
            meshPart.material.setActiveTextures();

            // Rebind buffers.
            gl.enableVertexAttribArray(attributes["AVertexPosition"].glLocation);
            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vertices);
            gl.vertexAttribPointer(attributes["AVertexPosition"].glLocation, 3, gl.FLOAT, false, 0, 0);

            if (meshPart.texcoords != null && meshPart.texcoords.length != 0)
            {
                gl.enableVertexAttribArray(attributes["AVertexTexCoord"].glLocation);
                gl.bindBuffer(gl.ARRAY_BUFFER, buffers.texcoords);
                gl.vertexAttribPointer(attributes["AVertexTexCoord"].glLocation, 2, gl.FLOAT, false, 0, 0);
            }

            if (meshPart.normals != null && meshPart.normals.length != 0)
            {
                gl.enableVertexAttribArray(attributes["AVertexNormal"].glLocation);
                gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normals);
                gl.vertexAttribPointer(attributes["AVertexNormal"].glLocation, 3, gl.FLOAT, false, 0, 0);
            }

            if (meshPart.tangents != null && meshPart.tangents.length != 0)
            {
                gl.enableVertexAttribArray(attributes["AVertexTangent"].glLocation);
                gl.bindBuffer(gl.ARRAY_BUFFER, buffers.tangents);
                gl.vertexAttribPointer(attributes["AVertexTangent"].glLocation, 4, gl.FLOAT, false, 0, 0);
            }

            // draw
            if (mesh.bUseDrawArrays)
            {
                gl.drawArrays(gl.TRIANGLES, 0, meshPart.vertices.length / 3);
            }
            else
            {
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
                gl.drawElements(gl.TRIANGLES, meshPart.indices.length, gl.UNSIGNED_SHORT, 0);
            }

            gl.disableVertexAttribArray(attributes["AVertexPosition"].glLocation);

            if (meshPart.texcoords != null && meshPart.texcoords.length != 0)
            {
                gl.disableVertexAttribArray(attributes["AVertexTexCoord"].glLocation);
            }

            if (meshPart.normals != null && meshPart.normals.length != 0)
            {
                gl.disableVertexAttribArray(attributes["AVertexNormal"].glLocation);
            }

            if (meshPart.tangents != null && meshPart.tangents.length != 0)
            {
                gl.disableVertexAttribArray(attributes["AVertexTangent"].glLocation);
            }
        }
    }
}
