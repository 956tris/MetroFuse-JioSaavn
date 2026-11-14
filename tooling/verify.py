"""Verify published JioSaavn archive contents, API manifests and checksums."""
from pathlib import Path
import hashlib
import json
import zipfile

root = Path(__file__).resolve().parents[1]
artifacts = root / 'artifacts'
for extension in ['jar', 'apk', 'mfp']:
    path = artifacts / ('jiosaavn.' + extension)
    with zipfile.ZipFile(path) as archive:
        assert archive.testzip() is None, 'ZIP CRC failure: ' + path.name
        assert all(chr(92) not in name for name in archive.namelist()), 'Non-portable ZIP paths'
        manifest_path = 'assets/metrofuse/manifest.json' if extension == 'apk' else 'manifest.json'
        manifest = json.loads(archive.read(manifest_path))
        assert manifest['id'] == 'metrofuse.jiosaavn' and manifest['version'] == '1.2.0'
        assert manifest['api'] == '1.1.0' and 'home' in manifest['capabilities']
        assert 'login' not in manifest['capabilities']
        if extension == 'mfp':
            assert manifest['runtime'] == 'javascript'
            assert manifest['script'] in archive.namelist()
            for name, digest in manifest['integrity'].items():
                data = archive.read(name)
                assert hashlib.sha256(data).hexdigest() == digest, 'Payload hash mismatch: ' + name
                assert data == (root / 'javascript' / name).read_bytes(), 'Source/package mismatch: ' + name
        else:
            assert manifest['runtime'] == 'kotlin'
            assert manifest['composeAbi'] == 'kotlin-2.4.21_compose-1.13.0-beta02_api-1.1.0'
            assert manifest['entryClass'] == 'dev.metrofuse.jiosaavn.JioSaavnPlugin'
            if extension == 'jar':
                assert 'dev/metrofuse/jiosaavn/JioSaavnPlugin.class' in archive.namelist()
                assert not any(name.startswith(('dev/metrofuse/api/', 'kotlin/', 'kotlinx/', 'androidx/compose/')) for name in archive.namelist())
            else:
                assert 'AndroidManifest.xml' in archive.namelist() and 'classes.dex' in archive.namelist()
                assert archive.getinfo('resources.arsc').compress_type == zipfile.ZIP_STORED
for line in (artifacts / 'SHA256SUMS').read_text().splitlines():
    digest, name = line.split('  ', 1)
    assert hashlib.sha256((artifacts / name).read_bytes()).hexdigest() == digest, 'Release hash mismatch: ' + name
print('Verified JioSaavn JAR, APK and MFP, manifest compatibility, source/payload hashes and SHA256SUMS.')
