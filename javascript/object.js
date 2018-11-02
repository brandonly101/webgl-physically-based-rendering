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
    static createMesh(gl, srcMesh, materials)
    {
        var result = new Mesh();

        result.meshParts = [];

        let materialFaceIndices = [];

        let vertices = [];
        let texcoords = [];
        let normals = [];
        let faces = [];

        var arrObjLines = FileUtil.GetFile(srcMesh).split("\n");
        var faceToRender = 0;
        arrObjLines.forEach((elem) =>
        {
            let arrElem = elem.split(" ");
            switch (arrElem[0])
            {
            case "g":
                materialFaceIndices.push(faces.length);
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
                for (let i = 1; i <= 3; i++)
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
                    faces.push(
                    {
                        "vertexIndex": vertexIndex,
                        "texcoordIndex": texcoordIndex,
                        "normalIndex": normalIndex
                    });
                }
                break;
            }
        });

        // Indicate that we want to use gl.drawArrays() for complex models (for now).
        // Not performant, but maybe some day when I figure out how to properly
        // use an indices array with a format that is not 16-bit.
        result.indicesNum = faces.length;

        result.meshParts = [];
        let meshPart;
        let meshPartLastIndex = 0;
        for (let i = 0; i < faces.length; i++)
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

                meshPartLastIndex = i;
            }

            let face = faces[i];

            meshPart.vertices.push(vertices[face.vertexIndex].x);
            meshPart.vertices.push(vertices[face.vertexIndex].y);
            meshPart.vertices.push(vertices[face.vertexIndex].z);

            if (texcoords.length !== 0)
            {
                meshPart.texcoords.push(texcoords[face.texcoordIndex].u);
                meshPart.texcoords.push(texcoords[face.texcoordIndex].v);
            }

            if (normals.length !== 0)
            {
                meshPart.normals.push(normals[face.normalIndex].x);
                meshPart.normals.push(normals[face.normalIndex].y);
                meshPart.normals.push(normals[face.normalIndex].z);
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
    static createSphere(nDiv)
    {
        var result = new Mesh();
        result.meshParts = [{}];

        result.meshParts[0].vertices = [];
        result.meshParts[0].normals = [];
        result.meshParts[0].indices = [];

        let vertices = result.meshParts[0].vertices;
        let normals = result.meshParts[0].normals;
        let indices = result.meshParts[0].indices;

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

            // Create vertices buffer.
            buffers.vertices = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vertices);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.meshParts[i].vertices), gl.STATIC_DRAW);

            if (mesh.meshParts[i].texcoords != null)
            {
                buffers.texcoords = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, buffers.texcoords);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.meshParts[i].texcoords), gl.STATIC_DRAW);
            }

            // Create normals buffer, if applicable.
            if (mesh.meshParts[i].normals != null)
            {
                buffers.normals = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normals);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.meshParts[i].normals), gl.STATIC_DRAW);
            }

            // if (!mesh.meshParts[i].bUseDrawArrays)
            {
                // Create vertex indices buffer.
                buffers.indices = gl.createBuffer();
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(mesh.meshParts[i].indices), gl.STATIC_DRAW);
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
            const uniforms = meshPart.material.shaderProgramObject.uniforms;

            // Activate the WebGL shader program object.
            gl.useProgram(meshPart.material.shaderProgramObject.glShaderProgram);

            meshPart.material.shaderProgramObject.setUniforms();

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

            // draw
            // if (mesh.bUseDrawArrays)
            // {
            //     gl.drawArrays(gl.TRIANGLES, 0, mesh.indicesNum);
            // }
            // else
            // {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
            gl.drawElements(gl.TRIANGLES, meshPart.indices.length, gl.UNSIGNED_SHORT, 0);
            // }

            gl.disableVertexAttribArray(attributes["AVertexPosition"].glLocation);

            if (meshPart.texcoords != null && meshPart.texcoords.length != 0)
            {
                gl.disableVertexAttribArray(attributes["AVertexTexCoord"].glLocation);
            }

            if (meshPart.normals != null && meshPart.normals.length != 0)
            {
                gl.disableVertexAttribArray(attributes["AVertexNormal"].glLocation);
            }
        }
    }
}
