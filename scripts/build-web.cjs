const fs=require('node:fs');
const path=require('node:path');
const esbuild=require('esbuild');

const root=path.resolve(__dirname,'..');
const output=path.resolve(root,'web-dist');
// Only this generated directory may be replaced during a build.
if(output!==path.join(root,'web-dist')||path.dirname(output)!==root)throw Error('Invalid web output path');
esbuild.buildSync({entryPoints:[path.join(root,'src/game.js')],bundle:true,format:'iife',outfile:path.join(root,'dist/game.bundle.js'),logLevel:'info'});
fs.rmSync(output,{recursive:true,force:true});
fs.mkdirSync(path.join(output,'dist'),{recursive:true});
for(const file of ['index.html','styles.css'])fs.copyFileSync(path.join(root,file),path.join(output,file));
fs.copyFileSync(path.join(root,'dist/game.bundle.js'),path.join(output,'dist/game.bundle.js'));
fs.cpSync(path.join(root,'assets'),path.join(output,'assets'),{recursive:true});
console.log('Static game build ready: web-dist (HTML, CSS, bundled Three.js and audio only)');
