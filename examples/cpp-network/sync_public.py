"""Package this lab for the frontend, or verify the committed download assets."""

import argparse
from io import BytesIO
from pathlib import Path
import zipfile


SOURCE = Path(__file__).resolve().parent
PUBLIC = SOURCE.parents[1] / "frontend" / "public" / "examples" / "cpp-network"
FILES = (
    "CMakeLists.txt",
    "PRODUCTION_DESIGN.md",
    "README.md",
    "address_lookup.cpp",
    "socket_lab.cpp",
    "socket_lab_windows.cpp",
    "test_address_lookup.py",
    "test_socket_lab.py",
)
DIRECT_DOWNLOADS = ("address_lookup.cpp", "socket_lab.cpp", "socket_lab_windows.cpp")


def source_bytes(name: str) -> bytes:
    return (SOURCE / name).read_bytes().replace(b"\r\n", b"\n")


def archive_bytes() -> bytes:
    output = BytesIO()
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name in FILES:
            info = zipfile.ZipInfo(f"cpp-network-lab/{name}", date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            archive.writestr(info, source_bytes(name), compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
    return output.getvalue()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="fail if public downloads differ from the examples")
    args = parser.parse_args()
    expected = {name: source_bytes(name) for name in DIRECT_DOWNLOADS}
    expected["cpp-network-lab.zip"] = archive_bytes()
    if args.check:
        mismatches = [name for name in DIRECT_DOWNLOADS
                      if not (PUBLIC / name).is_file() or
                      (PUBLIC / name).read_bytes().replace(b"\r\n", b"\n") != source_bytes(name)]
        archive_path = PUBLIC / "cpp-network-lab.zip"
        try:
            with zipfile.ZipFile(archive_path) as archive:
                members = [f"cpp-network-lab/{name}" for name in FILES]
                if archive.namelist() != members or any(
                    archive.read(member) != source_bytes(name) for member, name in zip(members, FILES)
                ):
                    mismatches.append("cpp-network-lab.zip")
        except (FileNotFoundError, zipfile.BadZipFile, KeyError):
            mismatches.append("cpp-network-lab.zip")
        if mismatches:
            raise SystemExit("outdated C++ download assets: " + ", ".join(mismatches))
        print("C++ download assets match examples")
    else:
        PUBLIC.mkdir(parents=True, exist_ok=True)
        for name, data in expected.items():
            (PUBLIC / name).write_bytes(data)
        print("C++ download assets updated")


if __name__ == "__main__":
    main()
