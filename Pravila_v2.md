# Ažurirana sigurnosna pravila — zalijepi u Firebase konzolu

Projekt **nasakuharicasec** → Firestore Database → kartica **Rules** →
obriši sve → zalijepi ovo → **Publish**.

Promjena u odnosu na prije: za recepte više nije dovoljno samo biti prijavljen —
korisnik MORA imati i zapis (profil) u kolekciji `korisnici`. Tako uklonjeni
korisnik (kojem je profil obrisan) ne može više ni čitati ni pisati, čak i ako
mu Auth račun još postoji.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function prijavljen() {
      return request.auth != null;
    }
    // Ima li prijavljeni korisnik profil i nije onemogućen
    function imaProfil() {
      return prijavljen()
        && exists(/databases/$(database)/documents/korisnici/$(request.auth.uid))
        && get(/databases/$(database)/documents/korisnici/$(request.auth.uid)).data.disabled != true;
    }
    function jeAdmin() {
      return imaProfil()
        && get(/databases/$(database)/documents/korisnici/$(request.auth.uid)).data.admin == true;
    }

    // RECEPTI: samo prijavljeni S PROFILOM (i koji nije onemogućen)
    match /recepti/{id} {
      allow read, write: if imaProfil();
    }

    // KORISNICI
    match /korisnici/{uid} {
      allow read: if imaProfil();

      allow create: if jeAdmin();
      allow delete: if jeAdmin()
        && resource.data.superadmin != true;

      allow update: if
        (jeAdmin()
          && resource.data.superadmin != true
          && request.resource.data.superadmin == resource.data.superadmin)
        ||
        (request.auth.uid == uid
          && request.resource.data.admin == resource.data.admin
          && request.resource.data.superadmin == resource.data.superadmin);
    }
  }
}
```

## Što ovime dobivaš (četiri razine zaštite)

1. **Pri prijavi / učitavanju** — app provjeri profil; ako ga nema ili je
   onemogućen, odmah te odjavi i ne pusti unutra.
2. **Real-time** — ako admin obriše ili onemogući korisnika dok je prijavljen,
   app ga odjavi unutar sekunde.
3. **Pravila (ovaj dokument)** — i da netko zaobiđe app, baza odbija čitanje i
   pisanje bez profila.
4. **Superadmin zaštita** — tebe se ne može obrisati ni degradirati.

## Bonus: privremeno onemogući korisnika bez brisanja

Ako korisniku u Firestoreu (`korisnici/{uid}`) dodaš polje `disabled` (boolean)
= `true`, izgubit će pristup, ali zapis ostaje (lako ga vratiš na `false`).
Brisanje zapisa = trajno uklanjanje s popisa.

## Napomena o Auth računu

Brisanje profila uklanja pristup, ali sam Auth račun (e-mail/lozinka) ostaje u
**Authentication → Users**. Ako želiš i njega potpuno maknuti, obriši ga ondje
ručno. (Potpuno brisanje Auth računa iz same aplikacije nije moguće bez
poslužitelja, kao što smo ranije objasnili.)
```
