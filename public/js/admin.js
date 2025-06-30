async function GetMusic() {
    try{
        const res = await fetch('/admin/api/musica/cont');
        const dados = await res.json();
        return dados;
    }catch(err){
        return err;
    }
}

async function GetArtistas() {
    try{
        const res = await fetch('/admin/api/artista/cont');
        const dados = await res.json();
        return dados;
    }catch(err){
        return err;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    GetMusic().then((data)=>{
        const element = document.getElementById('MostrarMusicas');
        element.textContent = data.total_musicas;
    })
    GetArtistas().then((data)=>{
        const element = document.getElementById('MostrarArtistas');
        element.textContent = data.total_artistas;
    })
});