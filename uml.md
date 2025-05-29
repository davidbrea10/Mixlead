```
@startuml
!theme vibrant

class companies {
  + Cif: string
  + ContactPerson: string
  + Name: string
  + SecurityNumber: string
  + Telephone: string
  + createdAt: timestamp
}

class employees {
  + birthDate: string
  + companyId: string
  + createdAt: timestamp
  + dni: string
  + email: string
  + firstName: string
  + lastName: string
  + phone: string
  + role: string
}

class doses {
  + day: number
  + dose: number
  + entryMethod: string
  + month: number
  + startTime: timestamp
  + timestamp: timestamp
  + totalExposures: number
  + totalTime: number
  + year: number
}

class materials {
  + {materialName}: string
  .. fields ..
  + attenuationIr: number
  + attenuationSe: number
}

companies "1" *-- "0..*" employees : contains >
employees "1" *-- "0..*" doses : logs >
employees "1" *-- "0..*" materials : uses >

@enduml
```
