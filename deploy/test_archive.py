"""Offline tests of the exact archive-validation code embedded in the host script."""
import io
import pathlib
import subprocess
import sys
import tarfile
import tempfile
import unittest

SCRIPT = pathlib.Path(__file__).with_name('deploy-frontend.sh').read_text(encoding='utf-8')
EXTRACTOR = SCRIPT.split("<<'PY'\n", 1)[1].split('\nPY\n', 1)[0]


class ArchiveTests(unittest.TestCase):
    def check_archive(self, entries, succeeds):
        with tempfile.TemporaryDirectory() as folder:
            archive = pathlib.Path(folder) / 'package.tgz'
            destination = pathlib.Path(folder) / 'site'
            with tarfile.open(archive, 'w:gz') as output:
                for name, kind in entries:
                    entry = tarfile.TarInfo(name)
                    if kind == 'link':
                        entry.type = tarfile.SYMTYPE
                        entry.linkname = '/etc/passwd'
                        output.addfile(entry)
                    else:
                        data = b'<html>hello</html>'
                        entry.size = len(data)
                        output.addfile(entry, io.BytesIO(data))
            result = subprocess.run([sys.executable, '-c', EXTRACTOR, str(archive), str(destination)], capture_output=True)
            self.assertEqual(result.returncode == 0, succeeds, result.stderr.decode())
            if succeeds:
                self.assertEqual((destination / 'index.html').read_bytes(), b'<html>hello</html>')

    def test_valid(self):
        self.check_archive([('./index.html', 'file'), ('./assets/app.js', 'file')], True)

    def test_wrong_root(self):
        self.check_archive([('dist/index.html', 'file')], False)

    def test_traversal(self):
        self.check_archive([('index.html', 'file'), ('../outside', 'file')], False)

    def test_absolute_path(self):
        self.check_archive([('index.html', 'file'), ('/outside', 'file')], False)

    def test_symlink(self):
        self.check_archive([('index.html', 'file'), ('assets/file', 'link')], False)

    def test_duplicate(self):
        self.check_archive([('index.html', 'file'), ('./index.html', 'file')], False)


if __name__ == '__main__':
    unittest.main()
