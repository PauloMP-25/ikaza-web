import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class SearchService {
    // BehaviorSubject mantiene el último valor para nuevos suscriptores.
    private searchTermSource = new BehaviorSubject<string>('');

    // Exponemos el término de búsqueda como un Observable público.
    public currentSearchTerm = this.searchTermSource.asObservable();

    constructor() { }

    // Método para actualizar el término de búsqueda desde cualquier componente (como el Navbar).
    updateSearchTerm(term: string) {
        this.searchTermSource.next(term);
    }
}