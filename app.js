angular.module('FdtlApp', [])
.controller('FdtlCtrl', function($scope, $filter) {
    // Initial State
    $scope.isDark = true;
    $scope.data = { 
        type: 'domestic', 
        landings: "1", 
        off: new Date(new Date().setHours(8, 0, 0, 0)), 
        on: new Date(new Date().setHours(14, 0, 0, 0)) 
    };

    // Reference Table Data
    $scope.chartData = [
        {l:'1-2', ft:'10:00/9:00', fdp:'13:00'}, 
        {l:'3', ft:'08:00', fdp:'12:30'},
        {l:'4', ft:'08:00', fdp:'12:00'}, 
        {l:'5', ft:'08:00', fdp:'11:30'}, 
        {l:'6', ft:'08:00', fdp:'11:00'}
    ];

    // Helper: Decimal to HH:MM format
    const toHHMM = (dec) => {
        const h = Math.floor(dec);
        const m = Math.round((dec - h) * 60);
        return h.toString().padStart(2, '0') + ":" + m.toString().padStart(2, '0');
    };

    // Core Calculation Logic
    $scope.calc = function() {
        if (!$scope.data.off || !$scope.data.on) return;

        const rMins = $scope.data.type === 'domestic' ? 60 : 75;
        const reportDate = new Date($scope.data.off.getTime() - rMins * 60000);
        const onDate = new Date($scope.data.on);
        const actualDec = (onDate - reportDate) / 3600000;

        const l = parseInt($scope.data.landings);
        const baseFDP = { "1": 13, "2": 13, "3": 12.5, "4": 12, "5": 11.5, "6": 11 }[l];

        let penalty = 0;
        let woclType = "No WOCL Impact";

        // Check for WOCL (Window of Circadian Low) Encroachment (02:00 - 06:00)
        let checkDays = [new Date(reportDate), new Date(reportDate.getTime() + 86400000)];
        
        checkDays.forEach(dayDate => {
            let wStart = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 2, 0, 0);
            let wEnd = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 6, 0, 0);

            if (reportDate <= wStart && onDate >= wEnd) {
                penalty = Math.max(penalty, 2.0);
                woclType = "Full Encroachment (2h Fixed)";
            } else if (reportDate >= wStart && reportDate < wEnd) {
                let hoursIn = (wEnd - reportDate) / 3600000;
                penalty = Math.max(penalty, Math.min(hoursIn, 2.0));
                woclType = "Start Encroachment (100% Max 2h)";
            } else if (onDate > wStart && onDate <= wEnd) {
                let hoursIn = (onDate - wStart) / 3600000;
                penalty = Math.max(penalty, hoursIn * 0.5);
                woclType = "End Encroachment (50%)";
            }
        });

        const maxFDP = baseFDP - penalty;
        const buffer = maxFDP - actualDec;

        // Update Results Object
        $scope.res = {
            reportTime: $filter('date')(reportDate, 'HH:mm'),
            actualFDP: toHHMM(actualDec),
            maxFDP: toHHMM(maxFDP),
            penalty: toHHMM(penalty),
            penaltyVal: penalty,
            woclType: woclType,
            buffer: (buffer >= 0 ? "+" : "-") + toHHMM(Math.abs(buffer)),
            isLegal: actualDec <= maxFDP && actualDec > 0,
            posStart: (reportDate.getHours() / 24) * 100,
            posWidth: Math.min((actualDec / 24) * 100, 100)
        };
    };

    // Run calculation on init
    $scope.calc();
});


