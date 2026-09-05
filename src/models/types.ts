export enum SeatStatus {
    AVAILABLE =  'AVAILABLE' , 
    HELD = 'HELD', // waiting for checkout
    BOOKED = 'BOOKED'
}

export enum OrderStatus{
    PENDING = 'PENDING' , 
    COMPLETED= 'COMPLETED', 
    FAILED = 'FAILED' , 
    CANCELLED = 'CANCELLED'
}
